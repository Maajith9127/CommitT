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
  backendInstances: any[],
  penaltyOverride?: TaskDraft["penalty"]
) {
  // ── 1. Create a highly robust local identification hash ──
  const localId = `local_${now}_${Math.random().toString(36).slice(2, 9)}`;

  // ── 2. Persist the absolute Main Task Document ──
  await db.runAsync(
    `INSERT INTO local_tasks
      (id, convex_id, assigner_id, assignee_id, title, description,
       visibility, recurrence_json, conditions_json, config_json,
       penalty_json, penalty_waiver_json,
       strict_until, strict_duration_days,
       created_at, updated_at, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      penaltyOverride ? JSON.stringify(penaltyOverride) : (draft.penalty ? JSON.stringify(draft.penalty) : null),
      draft.penalty_waiver ? JSON.stringify(draft.penalty_waiver) : null,
      null, // Initial creation usually doesn't have strict mode set in draft
      null,
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
  backendInstances: any[],
  penaltyOverride?: TaskDraft["penalty"]
) {
  // ── 1. Overwrite the Master Task Entity completely ──
  await db.runAsync(
    `UPDATE local_tasks SET
      title = ?, description = ?, visibility = ?,
      recurrence_json = ?, conditions_json = ?, config_json = ?,
      penalty_json = ?, penalty_waiver_json = ?,
      updated_at = ?, synced_at = ?
    WHERE convex_id = ?`,
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
    
    // Brutally purge the stale historical projections from ALL relevant tables
    // to ensure no duplicates or orphaned blocking rules exist.
    await db.runAsync("DELETE FROM task_instances WHERE task_id = ?", [localTaskId]);
    await db.runAsync("DELETE FROM blocked_apps WHERE task_id = ?", [localTaskId]);
    await db.runAsync("DELETE FROM blocked_websites WHERE task_id = ?", [localTaskId]);
    
    // Repopulate fully aligned with the newly edited timeframe constraints
    await syncInstancesToLocalDb(db, localTaskId, backendInstances, now);
  }
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
    WHERE convex_id = ?`,
    [strictUntil, durationDays, now, taskId]
  );

  // 2. Fetch the local task ID
  const taskRow = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM local_tasks WHERE convex_id = ?",
    [taskId]
  );

  // 3. Update all upcoming instances to reflect the new strict_until date
  if (taskRow) {
    // For simplicity and correctness, we re-sync all instances returned by the mutation
    // because strict_mode activation retroactively locks existing instances too.
    await db.runAsync("DELETE FROM task_instances WHERE task_id = ?", [taskRow.id]);
    await syncInstancesToLocalDb(db, taskRow.id, backendInstances, now);
  }
  
  console.log(`[TaskRepository] Strict Mode Local Sync Complete for task: ${taskId}`);
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
    `INSERT INTO task_instances 
      (id, task_id, convex_id, scheduled_timestamp, start_time, end_time, status, title,
       config_json, checkpoints, conditions_json, penalty_json, penalty_waiver_json,
       strict_until, is_manual_edit, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const blockAppsStatement = await db.prepareAsync(
    `INSERT INTO blocked_apps (task_id, package_name, active_from, active_until) 
     VALUES (?, ?, ?, ?)`
  );

  const blockWebStatement = await db.prepareAsync(
    `INSERT INTO blocked_websites (task_id, domain, active_from, active_until) 
     VALUES (?, ?, ?, ?)`
  );

  try {
    for (const instance of backendInstances) {
      const instanceId = `inst_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      
      // A. Insert the main instance 
      await instanceStatement.executeAsync([
        instanceId,
        localTaskId,
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

      // B. Project Digital Commitments (Blocked Apps & Websites) into dedicated tables
      // This allows the native enforcer to query simple flat tables instead of parsing JSON.
      if (instance.conditions) {
        const digitalCond = instance.conditions.find((c: any) => c.metric_key === "digital_commitment");
        if (digitalCond?.target?.value) {
          const { apps = [], websites = [] } = digitalCond.target.value;
          
          for (const pkg of apps) {
            await blockAppsStatement.executeAsync([localTaskId, pkg, instance.start, instance.end]);
          }
          
          for (const domain of websites) {
            await blockWebStatement.executeAsync([localTaskId, domain, instance.start, instance.end]);
          }
        }
      }
    }
    console.log(`[TaskRepository] SQLite sync complete. Projected ${backendInstances.length} instances.`);
  } finally {
    await instanceStatement.finalizeAsync();
    await blockAppsStatement.finalizeAsync();
    await blockWebStatement.finalizeAsync();
  }
}
