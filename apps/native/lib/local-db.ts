/**
 * Local Database (expo-sqlite)
 *
 * Initializes and manages the local SQLite database.
 * Schema mirrors the Convex `tasks` table exactly.
 *
 * @module lib/local-db
 */

import { type SQLiteDatabase } from "expo-sqlite";

// ─────────────────────────────────────────────────────────────────────────────
// Schema Version — bump this when you add migrations
// ─────────────────────────────────────────────────────────────────────────────
const DATABASE_VERSION = 4;

/**
 * Migration runner. Called by SQLiteProvider's `onInit` prop.
 * Uses PRAGMA user_version to track the current schema version.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  let currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  // ── Migration 0 → 1 (initial, may have old schema) ─────────────────────
  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      PRAGMA foreign_keys = ON;
    `);
    currentVersion = 1;
  }

  // ── Migration 1 → 2 (drop old tables, recreate with correct schema) ────
  if (currentVersion === 1) {
    await db.execAsync(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS blocked_apps;
      DROP TABLE IF EXISTS alarm_overrides;
      DROP TABLE IF EXISTS scheduled_alarms;
      DROP TABLE IF EXISTS local_tasks;
      PRAGMA foreign_keys = ON;

      -- ═══════════════════════════════════════════════════════════════════
      -- local_tasks: Exact mirror of Convex tasks table
      -- ═══════════════════════════════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS local_tasks (
        id TEXT PRIMARY KEY,
        convex_id TEXT UNIQUE NOT NULL,
        assigner_id TEXT NOT NULL,
        assignee_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        visibility TEXT NOT NULL,
        recurrence_json TEXT NOT NULL,
        conditions_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        synced_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON local_tasks(assignee_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigner ON local_tasks(assigner_id);

      -- ═══════════════════════════════════════════════════════════════════
      -- scheduled_alarms
      -- ═══════════════════════════════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS scheduled_alarms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL REFERENCES local_tasks(id) ON DELETE CASCADE,
        fire_at INTEGER NOT NULL,
        instance_start INTEGER NOT NULL,
        instance_end INTEGER NOT NULL,
        pester_count INTEGER DEFAULT 0,
        dismissed INTEGER DEFAULT 0,
        os_alarm_id INTEGER,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_alarm_fire ON scheduled_alarms(fire_at, dismissed);
      CREATE INDEX IF NOT EXISTS idx_alarm_task ON scheduled_alarms(task_id);

      -- ═══════════════════════════════════════════════════════════════════
      -- alarm_overrides
      -- ═══════════════════════════════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS alarm_overrides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL REFERENCES local_tasks(id) ON DELETE CASCADE,
        original_start INTEGER NOT NULL,
        new_start INTEGER,
        new_end INTEGER,
        cancelled INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        UNIQUE(task_id, original_start)
      );
      CREATE INDEX IF NOT EXISTS idx_override_task ON alarm_overrides(task_id);

      -- ═══════════════════════════════════════════════════════════════════
      -- blocked_apps (future use)
      -- ═══════════════════════════════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS blocked_apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL REFERENCES local_tasks(id) ON DELETE CASCADE,
        package_name TEXT NOT NULL,
        active_from INTEGER,
        active_until INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_blocked_package ON blocked_apps(package_name, active_until);
    `);

    currentVersion = 2;
  }

  // ── Migration 2 → 3 (add task_instances for JS-calculated scheduling)
  if (currentVersion === 2) {
    await db.execAsync(`
      PRAGMA foreign_keys = OFF;
      -- ═══════════════════════════════════════════════════════════════════
      -- task_instances
      -- ═══════════════════════════════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS task_instances (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES local_tasks(id) ON DELETE CASCADE,
        convex_id TEXT NOT NULL,
        scheduled_timestamp INTEGER NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        status TEXT DEFAULT 'pending', 
        title TEXT DEFAULT '',
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_task_instances_time ON task_instances(start_time, end_time);
      CREATE INDEX IF NOT EXISTS idx_task_instances_task ON task_instances(task_id);
      PRAGMA foreign_keys = ON;
    `);
    currentVersion = 3;
  }

  // ── Migration 3 → 4 (add title to task_instances for explicit querying)
  if (currentVersion === 3) {
    await db.execAsync(`
      ALTER TABLE task_instances ADD COLUMN title TEXT DEFAULT '';
    `);
    currentVersion = 4;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Database name constant
// ─────────────────────────────────────────────────────────────────────────────
export const LOCAL_DB_NAME = "commit.db";
