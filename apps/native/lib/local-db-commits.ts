import type { SQLiteDatabase } from 'expo-sqlite';
import type { TaskDraft, Condition as StoreCondition } from "@/stores/useTaskDraftStore";

/**
 * nukes all local data for testing / re-sync
 */
export async function nukeLocalDb(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM local_tasks');
    await db.runAsync('DELETE FROM task_instances');
  });
}

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  Local SQL Task Repository — The "Vault Guard"                               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  PURPOSE:                                                                    ║
 * ║  This repository captures the Source of Truth from Convex (Cloud) and        ║
 * ║  persists it to the local kernel (SQLite).                                   ║
 * ║                                                                              ║
 * ║  IDENTITY STRATEGY (UNIFIED IDENTITY):                                       ║
 * ║  To prevent "Split-Brain" duplication, we use the official Convex _id as     ║
 * ║  the local primary key ('id'). This ensures that the Triple-Write Saga and   ║
 * ║  the Hydration Engine always target the same physical rows in the database.  ║
 * ║                                                                              ║
 * ║  WRITE STRATEGY:                                                             ║
 * ║  Uses ATOMIC UPSERTS (INSERT OR REPLACE). This handles race conditions where ║
 * ║  the Saga and the Sync Delta arrive at the phone simultaneously.             ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

export async function insertTaskToLocalDb(
  db: SQLiteDatabase,
  draft: TaskDraft,
  remoteId: string,
  now: number,
  cleanedConditions: Omit<StoreCondition, "id">[],
  backendInstances: any[],
  penaltyOverride?: TaskDraft["penalty"]
) {
  // ── 1. ATOMIC TRANSACTION: Persist task + all instances as one unit ──
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT OR REPLACE INTO local_tasks
        (id, convex_id, assigner_id, assignee_id, title, description,
         visibility, recurrence_json, conditions_json, config_json,
         penalty_json, penalty_waiver_json,
         strict_until, strict_duration_days,
         created_at, updated_at, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        remoteId, // local ID is now identical to the Convex ID (Source of Truth)
        remoteId, // duplicated in convex_id for legacy query compatibility
        draft.assigner_id,
        draft.assignee_id,
        draft.title,
        draft.description,
        draft.visibility,
        JSON.stringify(draft.recurrence),
        JSON.stringify(cleanedConditions),
        JSON.stringify(draft.config),
        penaltyOverride ? JSON.stringify(penaltyOverride) : (draft.penalty ? JSON.stringify(draft.penalty) : null),
        draft.penalty_waiver ? JSON.stringify(draft.penalty_waiver) : null,
        null,
        null,
        now,
        now,
        now,
      ]
    );
    console.log('[TaskRepository] Unified Identity Upsert OK (Saga). ID:', remoteId);

    // ── 2. Propagate all newly projected future Checkpoints ──
    await syncInstancesToLocalDb(db, remoteId, backendInstances, now);
  });
}

export async function updateTaskInLocalDb(
  db: SQLiteDatabase,
  draft: TaskDraft,
  remoteId: string,
  now: number,
  cleanedConditions: Omit<StoreCondition, "id">[],
  backendInstances: any[],
  penaltyOverride?: TaskDraft["penalty"]
) {
  // ATOMIC TRANSACTION: Update task + purge stale instances + repopulate trajectory
  await db.withTransactionAsync(async () => {
    // ── 1. Overwrite the Master Task Entity completely (Uses Unified Primary Key) ──
    await db.runAsync(
      `UPDATE local_tasks SET
        title = ?, description = ?, visibility = ?,
        recurrence_json = ?, conditions_json = ?, config_json = ?,
        penalty_json = ?, penalty_waiver_json = ?,
        updated_at = ?, synced_at = ?
      WHERE id = ?`, // Direct target via Unified Primary Key
      [
        draft.title,
        draft.description,
        draft.visibility,
        JSON.stringify(draft.recurrence),
        JSON.stringify(cleanedConditions),
        JSON.stringify(draft.config),
        penaltyOverride ? JSON.stringify(penaltyOverride) : (draft.penalty ? JSON.stringify(draft.penalty) : null),
        draft.penalty_waiver ? JSON.stringify(draft.penalty_waiver) : null,
        now,
        now,
        remoteId, // This is the Convex _id
      ]
    );

    console.log('[TaskRepository] Unified Identity Sync: Task master rules updated.');

    // ── 2. Atomically overwrite the entire future schedule trajectory ──
    // No lookup needed — remoteId is the task_id in the instance world.
    // We protect manually edited instances from this purge.
    await db.runAsync("DELETE FROM task_instances WHERE task_id = ? AND is_manual_edit = 0", [remoteId]);

    // 3. Repopulate fully aligned with the newly edited timeframe constraints.
    await syncInstancesToLocalDb(db, remoteId, backendInstances, now);
    console.log('[TaskRepository] Unified Identity Sync: Overwritten instances successfully.');
  });
}

/**
 * Updates STRICT MODE status for a task and its instances in the local database.
 * Used when the user activates/extends a vault lock.
 */
export async function updateStrictModeInLocalDb(
  db: SQLiteDatabase,
  taskId: string,
  strictUntil: number,
  durationDays: number,
  backendInstances: any[]
) {
  const now = Date.now();

  // 1. Update the parent task document
  await db.runAsync(
    `UPDATE local_tasks SET
      strict_until = ?,
      strict_duration_days = ?,
      updated_at = ?
    WHERE id = ?`, // Direct target via Unified Primary Key
    [strictUntil, durationDays, now, taskId]
  );

  // 2. Update all upcoming instances to reflect the new strict_until date.
  // For simplicity and correctness, we re-sync all instances returned by the mutation
  // because strict_mode activation retroactively locks existing instances too.
  await db.runAsync("DELETE FROM task_instances WHERE task_id = ? AND is_manual_edit = 0", [taskId]);
  await syncInstancesToLocalDb(db, taskId, backendInstances, now);
  
  console.log(`[TaskRepository] Unified Strict Mode Sync Complete: ${taskId}`);
}

/**
 * Updates a SINGLE instance in the local database.
 * Used for real-time status updates, verification results, and instance-specific locks.
 */
export async function updateInstanceInLocalDb(
  db: SQLiteDatabase,
  instanceId: string,
  updates: {
    status?: string;
    conditions?: any[];
    checkpoints?: any[];
    strict_until?: number;
    penalty_waiver?: any;
    is_manual_edit?: boolean;
    start?: number;
    end?: number;
  }
) {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.status) { fields.push("status = ?"); values.push(updates.status); }
  if (updates.conditions) { fields.push("conditions_json = ?"); values.push(JSON.stringify(updates.conditions)); }
  if (updates.checkpoints) { fields.push("checkpoints = ?"); values.push(JSON.stringify(updates.checkpoints)); }
  if (updates.strict_until !== undefined) { fields.push("strict_until = ?"); values.push(updates.strict_until); }
  if (updates.penalty_waiver) { fields.push("penalty_waiver_json = ?"); values.push(JSON.stringify(updates.penalty_waiver)); }
  if (updates.is_manual_edit !== undefined) { fields.push("is_manual_edit = ?"); values.push(updates.is_manual_edit ? 1 : 0); }
  if (updates.start) { fields.push("start_time = ?"); values.push(updates.start); }
  if (updates.end) { fields.push("end_time = ?"); values.push(updates.end); }

  if (fields.length === 0) return;

  values.push(instanceId);

  await db.runAsync(
    `UPDATE task_instances SET ${fields.join(", ")} WHERE convex_id = ?`,
    values
  );
  
  console.log(`[TaskRepository] Instance Local Sync OK: ${instanceId}`);
}

/**
 * High-performance batched bulk-insert loop for Task Instances.
 */
async function syncInstancesToLocalDb(db: SQLiteDatabase, localTaskId: string, backendInstances: any[], now: number) {
  if (backendInstances.length === 0) return;

  // 1. Prepare statements for batched insertion
  const instanceStatement = await db.prepareAsync(
    `INSERT OR REPLACE INTO task_instances 
      (id, task_id, convex_id, scheduled_timestamp, start_time, end_time, status, title,
       config_json, checkpoints, conditions_json, penalty_json, penalty_waiver_json,
       strict_until, is_manual_edit, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  try {
    for (const instance of backendInstances) {
      // A. Insert the main instance 
      await instanceStatement.executeAsync([
        instance._id, // Official Convex ID as Primary Key
        localTaskId,  // Linked to Unified Parent ID
        instance._id,
        instance.start,
        instance.start,
        instance.end,
        instance.status || 'pending',
        instance.title,
        JSON.stringify(instance.config || {}),
        JSON.stringify(instance.checkpoints || []),
        instance.conditions ? JSON.stringify(instance.conditions) : null,
        instance.penalty ? JSON.stringify(instance.penalty) : null,
        instance.penalty_waiver ? JSON.stringify(instance.penalty_waiver) : null,
        instance.strict_until || null,
        instance.is_manual_edit ? 1 : 0,
        now,
      ]);

      // B. Project Digital Commitments (Legacy table inserts removed)
    }
    console.log(`[TaskRepository] SQLite sync complete. Projected ${backendInstances.length} instances.`);
  } finally {
    try { await instanceStatement.finalizeAsync(); } catch (e) {
      console.warn('[TaskRepository] instanceStatement finalize failed:', e);
    }
  }
}
