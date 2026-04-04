import { SQLiteDatabase } from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';

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
 * If the app crashes midway, the transaction aborts, ensuring zero data corruption.
 */
export async function ingestDeltaPayload(db: SQLiteDatabase, payload: DeltaPayload) {
  console.log('[SyncEngine] Ingesting Delta Payload...', {
    tasks: payload.tasks.length,
    instances: payload.instances.length,
    token: payload.sync_token,
  });

  // Turn off foreign keys BEFORE the transaction to allow ingested Orphaned Instances
  await db.execAsync('PRAGMA foreign_keys = OFF;');

  try {
    // Execute a secure Native Transaction
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
        task._id,                     // Using Convex ID as local ID for safety, or a custom mapper
        task._id,                     // convex_id
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
        Date.now() // synced_at
      ]);
    }

    // 2. Ingest Instances (INSERT OR REPLACE)
    for (const instance of payload.instances) {
      
      // SQLite Foreign Keys are temporarily disabled, allowing these orphaned
      // instances to slip into the DB to preserve historical Calendar states.

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
        instance.start || 0, // Using start time as scheduled_timestamp proxy if missing
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
  } finally {
    // Re-enable Database Guards ensuring absolute Structural Integrity
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }

  // 3. Persist the Sync Token safely ONLY if transaction succeeded
  await SecureStore.setItemAsync(SYNC_TOKEN_KEY, payload.sync_token.toString());
  console.log(`[SyncEngine] Sync Complete. Token ${payload.sync_token} locked in SecureStore.`);
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
