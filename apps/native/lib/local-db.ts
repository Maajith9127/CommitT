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
const DATABASE_VERSION = 11;

/**
 * Migration runner. Called by SQLiteProvider's `onInit` prop.
 * Uses PRAGMA user_version to track the current schema version.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  let result;
  try {
    result = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  } catch (e: any) {
    console.error("[LocalDB] FATAL: Initialization failed.", e);
    if (String(e).includes("malformed")) {
      console.error("🚨 CRITICAL: Database disk image is malformed. Please wipe app data/cache and restart.");
    }
    throw e;
  }
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
        config_json TEXT NOT NULL DEFAULT '{}',
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
        config_json TEXT NOT NULL DEFAULT '{}',
        checkpoints TEXT NOT NULL DEFAULT '[]',
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
    try {
      await db.execAsync(`ALTER TABLE task_instances ADD COLUMN title TEXT DEFAULT '';`);
    } catch (e) {
      console.log('[Migration 3→4] Column title might already exist', e);
    }
    currentVersion = 4;
  }

  // ── Migration 4 → 5 (add config_json to local_tasks for alarm settings)
  if (currentVersion === 4) {
    try {
      await db.execAsync(`ALTER TABLE local_tasks ADD COLUMN config_json TEXT NOT NULL DEFAULT '{}';`);
    } catch (e) {
      console.log('[Migration 4→5] Column config_json on local_tasks might already exist', e);
    }
    currentVersion = 5;
  }

  // ── Migration 5 → 6 (add config_json and checkpoints to task_instances)
  if (currentVersion === 5) {
    try {
      await db.execAsync(`ALTER TABLE task_instances ADD COLUMN config_json TEXT NOT NULL DEFAULT '{}';`);
    } catch (e) {
      console.log('Column config_json might already exist', e);
    }
    try {
      await db.execAsync(`ALTER TABLE task_instances ADD COLUMN checkpoints TEXT NOT NULL DEFAULT '[]';`);
    } catch (e) {
      console.log('Column checkpoints might already exist', e);
    }
    currentVersion = 6;
  }

  // ── Migration 6 → 7 (failsafe for checkpoints column if migration 6 was aborted midway)
  if (currentVersion === 6) {
    try {
      await db.execAsync(`ALTER TABLE task_instances ADD COLUMN config_json TEXT NOT NULL DEFAULT '{}';`);
    } catch (e) {}
    try {
      await db.execAsync(`ALTER TABLE task_instances ADD COLUMN checkpoints TEXT NOT NULL DEFAULT '[]';`);
    } catch (e) {}
    currentVersion = 7;
  }

  // ── Migration 7 → 8 (add penalty + conditions columns for full Convex parity)
  // ─────────────────────────────────────────────────────────────────────────────
  // local_tasks gets:
  //   • penalty_json — Stores the penalty rule { type, config } from Convex task
  //
  // task_instances gets:
  //   • penalty_json    — Immutable penalty snapshot from parent task
  //   • conditions_json — Per-instance condition statuses (verification results)
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentVersion === 7) {
    // local_tasks: penalty master rule
    try {
      await db.execAsync(`ALTER TABLE local_tasks ADD COLUMN penalty_json TEXT DEFAULT NULL;`);
    } catch (e) {
      console.log('[Migration 7→8] penalty_json on local_tasks might already exist', e);
    }

    // task_instances: penalty snapshot + per-instance conditions
    try {
      await db.execAsync(`ALTER TABLE task_instances ADD COLUMN penalty_json TEXT DEFAULT NULL;`);
    } catch (e) {
      console.log('[Migration 7→8] penalty_json on task_instances might already exist', e);
    }
    try {
      await db.execAsync(`ALTER TABLE task_instances ADD COLUMN conditions_json TEXT DEFAULT NULL;`);
    } catch (e) {
      console.log('[Migration 7→8] conditions_json on task_instances might already exist', e);
    }
    currentVersion = 8;
  }

  // ── Migration 8 → 9 (add is_manual_edit flag for instance preservation on task deletion)
  // ─────────────────────────────────────────────────────────────────────────────
  // When a task is deleted, all instances get nuked EXCEPT those the user
  // manually edited (e.g., rescheduled via drag-and-drop). This column mirrors
  // the Convex `is_manual_edit` boolean on taskInstances.
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentVersion === 8) {
    try {
      await db.execAsync(`ALTER TABLE task_instances ADD COLUMN is_manual_edit INTEGER DEFAULT 0;`);
    } catch (e) {
      console.log('[Migration 8→9] is_manual_edit on task_instances might already exist', e);
    }
    currentVersion = 9;
  }

  // ── Migration 9 → 10 (add Strict Mode + Penalty Waiver columns) ──
  if (currentVersion === 9) {
    console.log('[Migration] Migrating from 9 to 10 (Strict Mode Update)...');

    // Column expansion helper with precision error handling
    const addColumn = async (table: string, column: string, type: string) => {
      try {
        await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
      } catch (e: any) {
        // Silently tolerate "duplicate column" errors (common in dev/hot-reload)
        // while allowing structural or corruption errors to bubble up and stall migration.
        const message = String(e);
        if (message.includes("duplicate column") || message.includes("already exists")) {
          return;
        }
        throw e;
      }
    };

    // local_tasks expansion
    await addColumn('local_tasks', 'strict_until', 'INTEGER DEFAULT NULL');
    await addColumn('local_tasks', 'strict_duration_days', 'INTEGER DEFAULT NULL');
    await addColumn('local_tasks', 'penalty_waiver_json', 'TEXT DEFAULT NULL');

    // task_instances expansion
    await addColumn('task_instances', 'strict_until', 'INTEGER DEFAULT NULL');
    await addColumn('task_instances', 'penalty_waiver_json', 'TEXT DEFAULT NULL');

    await db.execAsync(`PRAGMA user_version = 10`);
    console.log('[Migration] 9 → 10 Successful.');
  }

  // ── Migration 10 → 11 (add blocked_websites table) ──
  if (currentVersion === 10) {
    console.log('[Migration] Migrating from 10 to 11 (Blocked Websites)...');
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS blocked_websites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL REFERENCES local_tasks(id) ON DELETE CASCADE,
        domain TEXT NOT NULL,
        active_from INTEGER,
        active_until INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_blocked_domain ON blocked_websites(domain, active_until);
      PRAGMA user_version = 11;
    `);
    
    console.log('[Migration] 10 → 11 Successful.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Database name constant
// ─────────────────────────────────────────────────────────────────────────────
export const LOCAL_DB_NAME = "commit.db";
