/**
 * Local Database (expo-sqlite)
 *
 * Initializes and manages the local SQLite database used for:
 * - Storing tasks with recurrence rules (for offline alarm scheduling)
 * - Tracking scheduled alarms and their state
 * - Storing alarm overrides (single-instance drag-and-drop changes)
 *
 * @module lib/local-db
 */

import { type SQLiteDatabase } from "expo-sqlite";

// ─────────────────────────────────────────────────────────────────────────────
// Schema Version — bump this when you add migrations
// ─────────────────────────────────────────────────────────────────────────────
const DATABASE_VERSION = 1;

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

  // ── Migration 0 → 1 ────────────────────────────────────────────────────
  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      PRAGMA foreign_keys = ON;

      -- ═══════════════════════════════════════════════════════════════════
      -- local_tasks: Mirror of Convex tasks (only the fields needed locally)
      -- ═══════════════════════════════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS local_tasks (
        id TEXT PRIMARY KEY,
        convex_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        recurrence_json TEXT NOT NULL,
        conditions_json TEXT NOT NULL,
        alarm_offset_ms INTEGER DEFAULT 900000,
        alarm_repeat_ms INTEGER DEFAULT 120000,
        synced_at INTEGER,
        created_at INTEGER NOT NULL
      );

      -- ═══════════════════════════════════════════════════════════════════
      -- scheduled_alarms: Currently scheduled alarms with AlarmManager
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
      -- alarm_overrides: Single-instance exceptions (drag-and-drop changes)
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
      -- blocked_apps: App blocking rules (future use)
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

    currentVersion = 1;
  }

  // ── Future migrations go here ──────────────────────────────────────────
  // if (currentVersion === 1) {
  //   await db.execAsync(`ALTER TABLE ...`);
  //   currentVersion = 2;
  // }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Database name constant
// ─────────────────────────────────────────────────────────────────────────────
export const LOCAL_DB_NAME = "commit.db";
