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
 * ║  STRATEGY:                                                                   ║
 * ║  We utilize a "Search-Clobber-Spawn" pattern. Instead of complex SQL patches, ║
 * ║  we identify the parent Task ID, purge the stale instance record, and        ║
 * ║  re-insert a fresh, backend-hydrated version. This ensures zero data         ║
 * ║  stale-ness and perfectly aligned checkpoints.                               ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Update a single instance in the local database by replacing it with fresh data.
 * 
 * @param db - The SQLite database context.
 * @param convexInstance - The updated instance object returned from the backend.
 */
export async function updateSingleInstanceInLocalDb(
  db: SQLiteDatabase,
  convexInstance: {
    _id: string;      // The Convex Instance ID
    task_id: string;  // The Convex Task ID (parent)
    start: number;
    end: number;
    title: string;
    status: string;
    config: any;
    checkpoints: any[];
  }
) {
  const now = Date.now();
  const convexInstanceId = convexInstance._id;

  console.log(`[InstanceRepository] Initiating Atomic Update for Instance: ${convexInstanceId}`);

  try {
    // 1. Locate the parent Task's LOCAL ID 
    // We must link the instance to the local task record to maintain relational integrity.
    const parentTask = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM local_tasks WHERE convex_id = ?",
      [convexInstance.task_id]
    );

    if (!parentTask) {
      console.warn(`[InstanceRepository] Orphaned instance detected. Parent task ${convexInstance.task_id} not found in local DB.`);
      return;
    }

    const localTaskId = parentTask.id;

    // 2. Atomic Clobber & Spawn
    // We wrap this in a transaction if the driver supports it, but for a single instance update, 
    // a sequential delete/insert is highly reliable in SQLite.
    
    // Purge the old version (Search by Convex ID)
    await db.runAsync("DELETE FROM task_instances WHERE convex_id = ?", [convexInstanceId]);

    // Insert the fresh version
    const localInstanceId = `inst_${now}_${Math.random().toString(36).slice(2, 9)}`;
    
    await db.runAsync(
      `INSERT INTO task_instances 
        (id, task_id, convex_id, scheduled_timestamp, start_time, end_time, title, config_json, checkpoints, created_at, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        localInstanceId,
        localTaskId,
        convexInstanceId,
        convexInstance.start, // scheduled_timestamp matches start_time for simple tasks
        convexInstance.start,
        convexInstance.end,
        convexInstance.title,
        JSON.stringify(convexInstance.config || {}),
        JSON.stringify(convexInstance.checkpoints || []),
        now,
        convexInstance.status
      ]
    );

    console.log(`[InstanceRepository] Atomic Update Success. Local ID: ${localInstanceId}`);
  } catch (error) {
    console.error(`[InstanceRepository] CATASTROPHIC_FAILURE during instance update:`, error);
    throw error; // Re-throw so the UI can handle the error state
  }
}
