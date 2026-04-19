/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  Local Database Schema — "Nuke & Pave" Architecture                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  PHILOSOPHY:                                                                 ║
 * ║  The local SQLite database is a DISPOSABLE CACHE of the Convex cloud.       ║
 * ║  Convex is the sole source of truth. If the local schema is ever out of     ║
 * ║  date, corrupted, or in an inconsistent state, we destroy it completely     ║
 * ║  and let the HydrationSync engine rebuild it from scratch ("Amnesia Mode"). ║
 * ║                                                                              ║
 * ║  SCHEMA VERSION: 12 (Instance-Dependent Architecture)                       ║
 * ║  • Zero foreign key constraints.                                            ║
 * ║  • Orphaned instances are first-class citizens.                             ║
 * ║  • All write paths are simplified and race-free.                            ║
 * ║                                                                              ║
 * ║  MIGRATION STRATEGY:                                                        ║
 * ║  There are NO incremental migrations. If `PRAGMA user_version` is anything  ║
 * ║  other than the current DATABASE_VERSION, we wipe all tables and deploy     ║
 * ║  the unified schema atomically. This eliminates the class of bugs caused    ║
 * ║  by partially-applied migrations (the "Frankenstein Schema" problem).       ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * @module lib/local-db
 */

import { type SQLiteDatabase } from "expo-sqlite";

// ─────────────────────────────────────────────────────────────────────────────
// Schema Version — the only version that matters.
// If the device holds any other version, the database is wiped and rebuilt.
// ─────────────────────────────────────────────────────────────────────────────
const DATABASE_VERSION = 12;

/**
 * The complete, unified V12 schema for the local SQLite cache.
 *
 * INSTANCE-DEPENDENT ARCHITECTURE:
 * ─────────────────────────────────
 * NO FOREIGN KEY CONSTRAINTS anywhere in this schema.
 *
 * RATIONALE:
 * The Convex backend intentionally preserves manually-edited and strict-locked
 * task instances even after their parent task is deleted (see removeInternal in
 * core/commitments/service.ts). This means the local DB MUST support orphaned
 * instances — instances whose parent task no longer exists.
 *
 * Previously, FOREIGN KEY constraints forced every write path to toggle
 * PRAGMA foreign_keys ON/OFF, which:
 *   1. Cannot be changed inside a transaction (SQLite ignores it).
 *   2. Creates race conditions when concurrent writers share a connection.
 *   3. Was a ROOT CAUSE of 'database disk image is malformed' errors.
 *
 * By removing FK constraints:
 *   • All PRAGMA foreign_keys toggles are eliminated.
 *   • Orphaned instances are first-class citizens.
 *   • Write paths are simplified and race-free.
 *   • Explicit DELETE statements handle cleanup (already in place).
 */
const UNIFIED_SCHEMA_V12 = `
  PRAGMA journal_mode = 'wal';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- PURGE: Drop everything so the rebuild is guaranteed clean.
  -- Order matters: drop children before parents (even though we have no FKs,
  -- this is a safety habit for any future schema changes).
  -- ═══════════════════════════════════════════════════════════════════════════
  DROP TABLE IF EXISTS blocked_websites;
  DROP TABLE IF EXISTS blocked_apps;
  DROP TABLE IF EXISTS alarm_overrides;
  DROP TABLE IF EXISTS scheduled_alarms;
  DROP TABLE IF EXISTS task_instances;
  DROP TABLE IF EXISTS local_tasks;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- local_tasks: Mirror of Convex "tasks" collection.
  -- ═══════════════════════════════════════════════════════════════════════════
  CREATE TABLE local_tasks (
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
    penalty_json TEXT DEFAULT NULL,
    penalty_waiver_json TEXT DEFAULT NULL,
    strict_until INTEGER DEFAULT NULL,
    strict_duration_days INTEGER DEFAULT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER
  );
  CREATE INDEX idx_tasks_assignee ON local_tasks(assignee_id);
  CREATE INDEX idx_tasks_assigner ON local_tasks(assigner_id);

  -- ═══════════════════════════════════════════════════════════════════════════
  -- task_instances: Individual commitment occurrences.
  -- Orphan-safe — no FK to local_tasks.
  -- ═══════════════════════════════════════════════════════════════════════════
  CREATE TABLE task_instances (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    convex_id TEXT NOT NULL,
    title TEXT DEFAULT '',
    scheduled_timestamp INTEGER NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    config_json TEXT NOT NULL DEFAULT '{}',
    checkpoints TEXT NOT NULL DEFAULT '[]',
    penalty_json TEXT DEFAULT NULL,
    conditions_json TEXT DEFAULT NULL,
    penalty_waiver_json TEXT DEFAULT NULL,
    is_manual_edit INTEGER DEFAULT 0,
    strict_until INTEGER DEFAULT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_task_instances_time ON task_instances(start_time, end_time);
  CREATE INDEX idx_task_instances_task ON task_instances(task_id);

  PRAGMA user_version = ${DATABASE_VERSION};
`;

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initializes the database schema. Called by SQLiteProvider's `onInit` prop.
 *
 * STRATEGY: "Nuke & Pave"
 * ─────────────────────────
 * 1. Read PRAGMA user_version.
 * 2. If it matches DATABASE_VERSION → do nothing (hot path, ~0ms).
 * 3. If it doesn't match → wipe everything and deploy the unified schema.
 * 4. If the PRAGMA read itself fails (malformed DB) → wipe and rebuild.
 *
 * This approach eliminates ALL incremental migration risks. The only cost
 * is a one-time full re-sync from Convex ("Amnesia Mode"), which takes
 * ~2-3 seconds on a typical dataset. Since the app is pre-release, there
 * are zero users on legacy schema versions.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  let currentVersion: number;

  try {
    const result = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
    currentVersion = result?.user_version ?? 0;
  } catch (e: any) {
    // ── CRITICAL: The PRAGMA read itself failed. ──────────────────────────
    // This means the database file is corrupted beyond recovery.
    // We'll attempt the full rebuild below. If that also fails, we let
    // the error propagate — the OS or user must clear app data manually.
    console.error("[LocalDB] FATAL: Cannot read PRAGMA user_version. Database may be corrupted.", e);
    currentVersion = -1;
  }

  // ── HOT PATH: Schema is current. Nothing to do. ──────────────────────────
  if (currentVersion === DATABASE_VERSION) {
    return;
  }

  // ── COLD PATH: Schema mismatch or corruption. Nuke & Pave. ───────────────
  console.log(
    `[LocalDB] Schema version mismatch: found v${currentVersion}, expected v${DATABASE_VERSION}. ` +
    `Executing full Nuke & Pave rebuild...`
  );

  try {
    await db.execAsync(UNIFIED_SCHEMA_V12);
    
    // Hard eliminate any lingering ghost WAL boundaries that corrupt Android JNI scans
    await db.execAsync(`
      PRAGMA wal_checkpoint(TRUNCATE);
      VACUUM;
    `);

    console.log(`[LocalDB] Nuke & Pave complete. Schema v${DATABASE_VERSION} deployed.`);
  } catch (rebuildError: any) {
    // ── LAST RESORT: Even the rebuild failed. ──────────────────────────────
    // This is extremely rare — usually means the SQLite binary itself is
    // broken or the filesystem is read-only. Log and re-throw so the app
    // can surface an error to the user.
    console.error("[LocalDB] FATAL: Schema rebuild failed. The database file may need manual deletion.", rebuildError);
    throw rebuildError;
  }
}

/**
 * Performs a complete database wipe and schema rebuild.
 *
 * This is the "nuclear option" — called by the Write Gate's auto-recovery
 * system when a terminal database error is detected (malformed, closed
 * resource, WAL corruption, etc.).
 *
 * After calling this, the HydrationSync engine must be triggered in
 * "Amnesia Mode" (no sync token) to repopulate all data from Convex.
 */
export async function nukeAndRebuildSchema(db: SQLiteDatabase): Promise<void> {
  console.log('[LocalDB] ☢️ NUKE & REBUILD: Destroying all local data and recreating schema...');

  try {
    await db.execAsync(UNIFIED_SCHEMA_V12);
    
    // Critical Infrastructure Fix: 
    // A standard DROP TABLE does not rebuild the physical .db file boundaries or clean out 
    // the Write-Ahead Log (WAL). If the WAL previously experienced catastrophic fragmentation, 
    // Android's native CursorWindow will attempt to read corrupted lengths (e.g. interpreting a 
    // ghost byte as asking for a 124MB string), instantly crashing the JVM with an OOM.
    // The VACUUM command physically reconstructs the entire database file from scratch.
    await db.execAsync(`
      PRAGMA wal_checkpoint(TRUNCATE);
      VACUUM;
    `);

    console.log('[LocalDB] ☢️ NUKE & REBUILD complete. Awaiting Amnesia re-sync from Convex.');
  } catch (error: any) {
    console.error('[LocalDB] ☢️ NUKE & REBUILD FAILED:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Database name constant
// ─────────────────────────────────────────────────────────────────────────────
export const LOCAL_DB_NAME = "commit.db";
