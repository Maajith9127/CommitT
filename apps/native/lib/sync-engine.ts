import { SQLiteDatabase } from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { Alert, BackHandler } from 'react-native';
import { Logger } from './logger';
import { purgeAllDataRecords } from './local-db';

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
      const skippedTaskIds = new Set<string>();

      // 1. Ingest Tasks (INSERT OR REPLACE)
      for (const task of payload.tasks) {
        /**
         * ───────────────────────────────────────────────────────────────
         * THE FRESHNESS GUARD (PILLAR 2) - TASKS
         * ───────────────────────────────────────────────────────────────
         * If the local Master Task has a newer updated_at timestamp than 
         * the incoming Convex payload, we discard the payload. This permanently
         * destroys the "Phantom Overwrite" bug where a background sync 
         * writes stale data over a user's fresh manual edit.
         */
        const existing = await db.getFirstAsync<{ updated_at: number }>(
          `SELECT updated_at FROM local_tasks WHERE id = ?`, [task._id]
        );
        
        // Convert Convex backend timestamp to comparible epoch.
        // Fallback to 0 only if data is totally malformed, ensuring local always wins.
        const incomingTime = task.updated_at || task._creationTime || 0;
        
        if (existing && existing.updated_at > incomingTime) {
          Logger.warn(`[SyncEngine] Freshness Guard: Discarding STALE Convex payload for task ${task._id}`);
          skippedTaskIds.add(task._id);
          continue;
        }

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
        /**
         * ───────────────────────────────────────────────────────────────
         * THE FRESHNESS GUARD (PILLAR 2) - INSTANCES
         * ───────────────────────────────────────────────────────────────
         */
        
        // 1. Parent Task Protection
        if (skippedTaskIds.has(instance.task_id)) {
          Logger.info(`[SyncEngine] Freshness Guard: Skipped instance ${instance._id} (Parent Locked)`);
          continue;
        }

        // 2. Individual Instance Protection
        // If local instance is a manually locked/waived edit, but the incoming Convex dataset 
        // doesn't have it flagged yet (stale), discard the incoming instance.
        const existingInstance = await db.getFirstAsync<{ is_manual_edit: number }>(
          `SELECT is_manual_edit FROM task_instances WHERE id = ?`, [instance._id]
        );

        if (existingInstance?.is_manual_edit === 1 && !instance.is_manual_edit) {
           Logger.warn(`[SyncEngine] Freshness Guard: Discarding STALE instance ${instance._id} (Local Manual Edit Active)`);
           continue;
        }

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

    const errorString = String(err).toLowerCase();

    /**
     * ** AUTOMATIC CORE RECOVERY **
     * If we detect structural corruption (malformed) or severe locking failure 
     * (disk I/O), we must prevent the app from entering a death loop. 
     * We purge the records and clear the sync token to force a full re-sync 
     * on the next operational cycle.
     */
    if (errorString.includes('malformed') || errorString.includes('disk i/o')) {
      Logger.error('[SyncEngine] CRITICAL DATABASE CORRUPTION DETECTED. Initiating recovery...');

      try {
        // 1. Clear records and truncate WAL to fix memory corruption
        await purgeAllDataRecords(db);

        // 2. Clear token to force Convex to provide a full payload next time
        await clearSyncToken();

        Logger.info('[SyncEngine] Recovery protocol successful. System state reset.');

        // 3. Notify user and force exit for clean reboot
        Alert.alert(
          "Critical System Sync",
          "A data inconsistency was detected. The system has been reset safely. A full resynchronization will occur upon restart.",
          [{ text: "OK", onPress: () => BackHandler.exitApp() }]
        );
      } catch (recoveryErr) {
        Logger.error('[SyncEngine] RECOVERY PROTOCOL FAILED. Manual intervention required.', recoveryErr);
      }
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
