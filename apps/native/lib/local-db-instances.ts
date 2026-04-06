import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  Local SQL Instance Repository — The "Temporal Auditor"                       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  PURPOSE:                                                                    ║
 * ║  Manages the lifecycle of individual task occurrences (instances) within      ║
 * ║  the local SQLite cache. This is critical for the "Offline-First" calendar   ║
 * ║  experience and hardware-level alarm synchronization.                        ║
 * ║                                                                              ║
 * *  IDENTITY STRATEGY (UNIFIED IDENTITY):                                       ║
 *  To prevent "Split-Brain" duplication, we use the official Convex _id as      ║
 *  the local primary key ('id'). This ensures that manual updates and the      ║
 *  Hydration Engine always target the same physical rows.                      ║
 *                                                                              ║
 *  ORPHAN SURVIVAL:                                                            ║
 *  The schema has ZERO foreign key constraints. Instances are first-class       ║
 *  citizens that can exist with or without a parent task. This aligns with      ║
 *  the Convex backend's "instance survival" model where manually-edited and     ║
 *  strict-locked instances outlive their parent task deletion.                  ║
 * ║                                                                              ║
 * ║  No PRAGMA foreign_keys toggles are needed anywhere in this file.             ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Update a single instance in the local database by replacing it with fresh data.
 * 
 * ORPHAN SUPPORT (V12): If the parent task has been deleted, this function
 * still persists the update. No FK bypass or PRAGMA toggle needed — the schema
 * natively supports orphaned instances.
 * 
 * @param db - The SQLite database context.
 * @param convexInstance - The updated instance object returned from the backend.
 */
export async function updateSingleInstanceInLocalDb(
  db: SQLiteDatabase,
  convexInstance: {
    _id: string;      // The Convex Instance ID
    task_id: string;  // The Convex Task ID (parent — may no longer exist)
    start: number;
    end: number;
    title: string;
    status: string;
    config: any;
    checkpoints: any[];
    conditions?: any[];                                        // Per-instance condition statuses
    penalty?: { type: string; config: any } | null;            // Immutable snapshot from parent task
    penalty_waiver?: any;                                      // Waiver snapshot
    strict_until?: number;                                     // Strict mode lock timestamp
    is_manual_edit?: boolean;                                   // Protects from deletion when parent task is removed
  }
) {
  const now = Date.now();
  const convexInstanceId = convexInstance._id;

  console.log(`[InstanceRepository] Initiating Atomic Update for Instance: ${convexInstanceId}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // RESOLVE LOCAL TASK ID (Best-Effort)
  // ─────────────────────────────────────────────────────────────────────────────
  // Attempt to find the parent task's local ID. If the parent was deleted 
  // (orphaned instance), we fall back to the raw Convex task_id.
  // V12: No PRAGMA toggle needed — the schema has no FK constraints.
  // ─────────────────────────────────────────────────────────────────────────────
  const parentTask = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM local_tasks WHERE convex_id = ?",
    [convexInstance.task_id]
  );

  const localTaskId = parentTask?.id ?? convexInstance.task_id;

  if (!parentTask) {
    console.warn(
      `[InstanceRepository] ORPHAN WRITE: Parent task ${convexInstance.task_id} not found locally. ` +
      `Writing with raw Convex task_id. This is expected for surviving instances.`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ATOMIC CLOBBER & SPAWN (Transaction-Protected)
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    await db.withTransactionAsync(async () => {
      // Purge the old version (Search by Unified ID)
      await db.runAsync("DELETE FROM task_instances WHERE id = ?", [convexInstanceId]);

      // Insert the fresh version using the Unified Convex ID as the Primary Key
      await db.runAsync(
        `INSERT INTO task_instances 
          (id, task_id, convex_id, scheduled_timestamp, start_time, end_time, status, title,
           config_json, checkpoints, conditions_json, penalty_json, penalty_waiver_json,
           strict_until, is_manual_edit, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          convexInstanceId,
          localTaskId,
          convexInstanceId,
          convexInstance.start,
          convexInstance.start,
          convexInstance.end,
          convexInstance.status,
          convexInstance.title,
          JSON.stringify(convexInstance.config || {}),
          JSON.stringify(convexInstance.checkpoints || []),
          convexInstance.conditions ? JSON.stringify(convexInstance.conditions) : null,
          convexInstance.penalty ? JSON.stringify(convexInstance.penalty) : null,
          convexInstance.penalty_waiver ? JSON.stringify(convexInstance.penalty_waiver) : null,
          convexInstance.strict_until || null,
          convexInstance.is_manual_edit ? 1 : 0,
          now,
        ]
      );

      console.log(`[InstanceRepository] Atomic Update Success. Unified ID: ${convexInstanceId}`);
    });
  } catch (error) {
    console.error(`[InstanceRepository] CATASTROPHIC_FAILURE during instance update:`, error);
    throw error; // Re-throw so the TripleWriteOrchestrator can trigger compensating actions
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DELETE SINGLE INSTANCE FROM LOCAL DB
 * ─────────────────────────────────────────────────────────────────────────────
 * Removes a single instance from the local SQLite cache by its Convex ID.
 * Used as the Disk step in the instance deletion TripleWrite Saga.
 * 
 * ORPHAN-SAFE: This operation does not require the parent task to exist.
 * We delete by convex_id, which is unique per instance.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function deleteSingleInstanceFromLocalDb(
  db: SQLiteDatabase,
  convexInstanceId: string
) {
  console.log(`[InstanceRepository] Deleting instance from local DB: ${convexInstanceId}`);
  
  try {
    const result = await db.runAsync(
      "DELETE FROM task_instances WHERE convex_id = ?",
      [convexInstanceId]
    );
    
    console.log(`[InstanceRepository] Instance ${convexInstanceId} purged. Rows affected: ${result.changes}`);
    return { success: true, rowsAffected: result.changes };
  } catch (error) {
    console.error(`[InstanceRepository] Failed to delete instance ${convexInstanceId}:`, error);
    throw error;
  }
}
