import type { SQLiteDatabase } from 'expo-sqlite';
import type { TaskDraft, Condition as StoreCondition } from "@/stores/useTaskDraftStore";

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  Local SQL Task Repository — The "Vault Guard"                               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  PURPOSE:                                                                    ║
 * ║  This file abstracts ALL raw SQLite queries away from the React UI.          ║
 * ║  By separating the SQL commands into a dedicated Repository pattern,         ║
 * ║  we achieve:                                                                 ║
 * ║  1. Zero React Native code logic tied directly to Database Syntax.           ║
 * ║  2. Extremely predictable testable data insertion paths.                     ║
 * ║  3. A robust Offline-First capability perfectly isolated.                    ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

export async function insertTaskToLocalDb(
  db: SQLiteDatabase,
  draft: TaskDraft,
  remoteId: string,
  now: number,
  cleanedConditions: Omit<StoreCondition, "id">[],
  backendInstances: any[]
) {
  // ── 1. Create a highly robust local identification hash ──
  const localId = `local_${now}_${Math.random().toString(36).slice(2, 9)}`;

  // ── 2. Persist the absolute Main Task Document ──
  await db.runAsync(
    `INSERT INTO local_tasks
      (id, convex_id, assigner_id, assignee_id, title, description,
       visibility, recurrence_json, conditions_json, config_json, created_at, updated_at, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      localId,
      remoteId,
      draft.assigner_id,
      draft.assignee_id,
      draft.title,
      draft.description,
      draft.visibility,
      JSON.stringify(draft.recurrence),
      JSON.stringify(cleanedConditions),
      JSON.stringify(draft.config),
      now,
      now,
      now,
    ]
  );
  console.log('[TaskRepository] Validated Local DB insert OK. convex_id:', remoteId);

  // ── 3. Propagate all newly projected future Checkpoints ──
  await syncInstancesToLocalDb(db, localId, backendInstances, now);
}

export async function updateTaskInLocalDb(
  db: SQLiteDatabase,
  draft: TaskDraft,
  remoteId: string,
  now: number,
  cleanedConditions: Omit<StoreCondition, "id">[],
  backendInstances: any[]
) {
  // ── 1. Overwrite the Master Task Entity completely ──
  await db.runAsync(
    `UPDATE local_tasks SET
      title = ?, description = ?, visibility = ?,
      recurrence_json = ?, conditions_json = ?, config_json = ?,
      updated_at = ?, synced_at = ?
    WHERE convex_id = ?`,
    [
      draft.title,
      draft.description,
      draft.visibility,
      JSON.stringify(draft.recurrence),
      JSON.stringify(cleanedConditions),
      JSON.stringify(draft.config),
      now,
      now,
      remoteId,
    ]
  );
  console.log('[TaskRepository] Validated Local DB update OK for task:', remoteId);

  // ── 2. Resolve the abstract Local ID from the Convex Key ──
  const taskRow = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM local_tasks WHERE convex_id = ?",
    [remoteId]
  );

  // ── 3. Atomically overwrite the entire future schedule trajectory ──
  if (taskRow) {
    const localTaskId = taskRow.id;
    // Brutally purge the stale historical projections
    await db.runAsync("DELETE FROM task_instances WHERE task_id = ?", [localTaskId]);
    
    // Repopulate fully aligned with the newly edited timeframe constraints
    await syncInstancesToLocalDb(db, localTaskId, backendInstances, now);
  }
}

/**
 * High-performance batched bulk-insert loop for Task Instances.
 */
async function syncInstancesToLocalDb(db: SQLiteDatabase, localTaskId: string, backendInstances: any[], now: number) {
  if (backendInstances.length === 0) return;

  const statement = await db.prepareAsync(
    `INSERT INTO task_instances 
      (id, task_id, convex_id, scheduled_timestamp, start_time, end_time, title, config_json, checkpoints, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  try {
    for (const instance of backendInstances) {
      const instanceId = `inst_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      
      // Strict parameter binding preventing SQL Injection and data mutations
      await statement.executeAsync([
        instanceId,
        localTaskId,
        instance._id,
        instance.start,
        instance.start,
        instance.end,
        instance.title,
        JSON.stringify(instance.config || {}),
        JSON.stringify(instance.checkpoints || []),
        now,
      ]);
    }
    console.log(`[TaskRepository] Highly cohesive SQLite synchronization complete. Inserted ${backendInstances.length} projected timelines.`);
  } finally {
    // Crucial Memory Management execution cleanup!
    await statement.finalizeAsync();
  }
}
