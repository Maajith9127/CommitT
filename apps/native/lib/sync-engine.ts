import { SQLiteDatabase } from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { Logger } from './logger';

const SYNC_TOKEN_KEY = 'commit_t_last_synced_at';

export interface DeltaPayload {
  tasks: any[];
  instances: any[];
  sync_token: number;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PROD-LEVEL ATOMIC INGESTOR
 * ─────────────────────────────────────────────────────────────────────────────
 * Takes the raw Delta payload from Convex and safely Upserts it into SQLite 
 * utilizing a rigidly locked Async Transaction. 
 * 
 * INSTANCE-DEPENDENT ARCHITECTURE (V12):
 * No PRAGMA foreign_keys toggles are needed. The schema has zero FK constraints,
 * so orphaned instances (instances whose parent task was deleted) are ingested
 * seamlessly. This eliminates the race condition that previously caused
 * 'database disk image is malformed' errors.
 * 
 * CORRUPTION PREVENTION:
 * 1. All multi-row writes are wrapped in withTransactionAsync().
 * 2. No PRAGMA state changes — zero race condition surface area.
 * 3. If the transaction fails, it rolls back atomically.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function ingestDeltaPayload(db: SQLiteDatabase, payload: DeltaPayload) {
  Logger.info(`[SyncEngine] Ingesting Delta: ${payload.tasks.length} tasks, ${payload.instances.length} instances. Token: ${payload.sync_token}`);

  try {
    await db.withTransactionAsync(async () => {
      // 1. Ingest Tasks (INSERT OR REPLACE)
      for (const task of payload.tasks) {
        await db.runAsync(`
          INSERT OR REPLACE INTO local_tasks (
            id, convex_id, assigner_id, assignee_id, title, description, visibility,
            recurrence_json, conditions_json, config_json, penalty_json, penalty_waiver_json,
            strict_until, strict_duration_days, created_at, updated_at, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          task._id,
          task._id,
          task.assigner_id || '', 
          task.assignee_id || '',
          task.title || '',
          task.description || '',
          task.visibility || 'private',
          JSON.stringify(task.recurrence || {}),
          JSON.stringify(task.conditions || []),
          JSON.stringify(task.config || {}),
          task.penalty ? JSON.stringify(task.penalty) : null,
          task.penalty_waiver ? JSON.stringify(task.penalty_waiver) : null,
          task.strict_until || null,
          task.strict_duration_days || null,
          task.created_at || task._creationTime || Date.now(),
          task.updated_at || task._creationTime || Date.now(),
          Date.now()
        ]);
      }

      // 2. Ingest Instances (INSERT OR REPLACE)
      // V12: No FK constraints exist, so orphaned instances (task_id not in
      // local_tasks) are inserted without error. This aligns with the Convex
      // backend's "instance survival" model.
      for (const instance of payload.instances) {
        await db.runAsync(`
          INSERT OR REPLACE INTO task_instances (
            id, task_id, convex_id, title, scheduled_timestamp, start_time, end_time,
            status, config_json, checkpoints, penalty_json, conditions_json, 
            penalty_waiver_json, is_manual_edit, strict_until, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          instance._id,
          instance.task_id,
          instance._id,
          instance.title || '',
          instance.start || 0,
          instance.start,
          instance.end,
          instance.status || 'pending',
          JSON.stringify(instance.config || {}),
          JSON.stringify(instance.checkpoints || []),
          instance.penalty ? JSON.stringify(instance.penalty) : null,
          instance.conditions ? JSON.stringify(instance.conditions) : null,
          instance.penalty_waiver ? JSON.stringify(instance.penalty_waiver) : null,
          instance.is_manual_edit ? 1 : 0,
          instance.strict_until || null,
          instance._creationTime || Date.now()
        ]);
      }
    });
  } catch (err: any) {
    Logger.error('[SyncEngine] TRANSACTION FAILED. Rolling back atomically.', err);

    if (String(err).includes('malformed')) {
      Logger.error('🚨 [SyncEngine] DATABASE CORRUPTION DETECTED during ingestion.');
      Logger.info('🚨 Recovery: Next boot will trigger Amnesia-mode full rebuild.');
    }

    throw err;
  }

  // 3. Persist the Sync Token safely ONLY if transaction succeeded
  await SecureStore.setItemAsync(SYNC_TOKEN_KEY, payload.sync_token.toString());
  Logger.info(`[SyncEngine] Sync Complete. Token ${payload.sync_token} locked.`);
}

/**
 * Reads the secure sync token to pass up to Convex.
 */
export async function getLocalSyncToken(): Promise<number | null> {
  const token = await SecureStore.getItemAsync(SYNC_TOKEN_KEY);
  if (!token) return null;
  return parseInt(token, 10);
}

/**
 * Destroys the sync token. Called when clearing App Data.
 */
export async function clearSyncToken() {
  await SecureStore.deleteItemAsync(SYNC_TOKEN_KEY);
}
