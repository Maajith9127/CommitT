import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useConvex } from "convex/react";
import { useSQLiteContext } from "expo-sqlite";
import { api } from "@commit/backend/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { getLocalSyncToken, ingestDeltaPayload, clearSyncToken } from "@/lib/sync-engine";
import { scheduleNextAlarm } from "@/modules/scheduler-module";
import { Logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
// These thresholds control the background resilience behavior. They are
// intentionally conservative to balance battery life against data freshness.

/**
 * Minimum elapsed time (ms) between two consecutive sync cycles.
 * Prevents rapid-fire reconciliations when the OS delivers multiple
 * `active` AppState transitions in quick succession (common during
 * permission dialogs, share sheets, and notification shade interactions).
 */
const FOREGROUND_DEBOUNCE_MS = 10_000; // 10 seconds

/**
 * Maximum number of times the engine will retry a failed SQLite health
 * check before permanently aborting the current cycle. Each retry is
 * separated by HEALTH_CHECK_RETRY_DELAY_MS.
 */
const MAX_HEALTH_CHECK_RETRIES = 3;

/**
 * Delay (ms) between SQLite health check retries. This gives the OS time
 * to finalize resource restoration after a background→foreground transition.
 */
const HEALTH_CHECK_RETRY_DELAY_MS = 1_500; // 1.5 seconds

// ─────────────────────────────────────────────────────────────────────────────
// HOOK: useHydrationSync
// ─────────────────────────────────────────────────────────────────────────────
//
// ARCHITECTURE OVERVIEW:
//
// This hook is the single source of truth for local↔cloud state reconciliation.
// It sits at the absolute root of the application tree (<HydrationEngine />)
// and is responsible for three critical operations:
//
//  1. BOOT SYNC — On app launch (or login), it detects whether the local
//     SQLite cache has been wiped ("Amnesia") or is warm, and performs
//     either a full rebuild or a delta patch accordingly.
//
//  2. FOREGROUND RE-SYNC — When the app returns from the background,
//     Android may have killed the Convex WebSocket and/or invalidated
//     the SQLite connection handle. This hook detects the foreground
//     transition via AppState and re-runs the reconciliation to heal
//     any stale state. This is the primary defense against the "zombie
//     connection" bug where Convex queries/mutations silently fail.
//
//  3. VERSION MISMATCH RECOVERY — When the Convex backend is redeployed,
//     the server's internal version counter resets. If the client holds
//     a stale version, this hook wipes the sync token and retriggers
//     a full state download automatically.
//
// INVARIANTS:
//  - Only ONE reconciliation cycle may be in-flight at any time (guarded
//    by the `isSyncingRef` mutex).
//  - All SQLite writes go through the `ingestDeltaPayload` atomic
//    transaction — partial writes are impossible.
//  - The hook is fully self-healing: any transient failure will be
//    automatically retried on the next foreground transition.
//
// ─────────────────────────────────────────────────────────────────────────────

export function useHydrationSync() {
  const convex = useConvex();
  const db = useSQLiteContext();
  const { data: session } = authClient.useSession();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFullyHydrated, setIsFullyHydrated] = useState(false);

  // ── Refs (stable across renders, invisible to React's reconciler) ──────
  
  /** Mutex: prevents overlapping sync cycles from racing each other. */
  const isSyncingRef = useRef(false);

  /** Timestamp of the last successful or attempted sync cycle start. */
  const lastSyncAttemptRef = useRef<number>(0);

  /** Cleanup flag: ensures async operations abort if the component unmounts. */
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // ─────────────────────────────────────────────────────────────────────
    // 1. AUTHORIZATION GATE
    // ─────────────────────────────────────────────────────────────────────
    // Never sync if the user is logged out. Reset hydration state so the
    // next login triggers a fresh boot sync.
    if (!session?.user?.id) {
      setIsFullyHydrated(false);
      return () => { isMountedRef.current = false; };
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. SQLITE HEALTH CHECK (with Retry)
    // ─────────────────────────────────────────────────────────────────────
    // Android aggressively reclaims resources when apps are backgrounded.
    // In release builds, the SQLite connection handle can become invalid
    // (`ERR_ACCESS_CLOSED_RESOURCE`). This function performs a lightweight
    // PRAGMA probe and retries up to MAX_HEALTH_CHECK_RETRIES times before
    // giving up on the current cycle.
    //
    // If retries are exhausted, the cycle aborts gracefully. The next
    // foreground transition will automatically retry via AppState.
    async function waitForHealthyDatabase(): Promise<boolean> {
      for (let attempt = 1; attempt <= MAX_HEALTH_CHECK_RETRIES; attempt++) {
        try {
          await db.execAsync('PRAGMA user_version;');
          return true; // Connection is alive
        } catch (resourceErr: any) {
          const errStr = String(resourceErr);

          // Corruption is unrecoverable at the sync layer — abort immediately.
          if (errStr.includes('malformed')) {
            Logger.error('🚨 [HydrationSync] DATABASE CORRUPTION DETECTED. Aborting sync permanently.');
            return false;
          }

          // Transient resource error — retry after a short delay.
          if (attempt < MAX_HEALTH_CHECK_RETRIES) {
            Logger.warn(
              `[HydrationSync] SQLite health check failed (attempt ${attempt}/${MAX_HEALTH_CHECK_RETRIES}). ` +
              `Retrying in ${HEALTH_CHECK_RETRY_DELAY_MS}ms...`
            );
            await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_RETRY_DELAY_MS));
          } else {
            Logger.error(
              `[HydrationSync] SQLite health check failed after ${MAX_HEALTH_CHECK_RETRIES} attempts. ` +
              `Deferring to next foreground cycle.`
            );
          }
        }
      }
      return false;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. CORE RECONCILIATION ENGINE
    // ─────────────────────────────────────────────────────────────────────
    // This function performs the actual cloud↔local sync. It is designed
    // to be safely callable multiple times (idempotent) and is protected
    // by a mutex to prevent overlapping executions.
    async function executeReconciliation() {
      if (!isMountedRef.current) return;

      // ── Mutex Gate ──
      // If a sync is already in-flight, silently bail. The in-flight
      // cycle will already deliver the latest state.
      if (isSyncingRef.current) {
        Logger.info('[HydrationSync] Sync already in-flight. Skipping duplicate trigger.');
        return;
      }

      // ── Debounce Gate ──
      // Reject rapid-fire triggers from OS-level AppState noise.
      const now = Date.now();
      if (now - lastSyncAttemptRef.current < FOREGROUND_DEBOUNCE_MS) {
        Logger.info('[HydrationSync] Debounced. Too soon since last attempt.');
        return;
      }

      // ── Acquire Mutex ──
      isSyncingRef.current = true;
      lastSyncAttemptRef.current = now;
      if (isMountedRef.current) setIsSyncing(true);

      try {
        // Phase 1: Validate the SQLite connection handle
        const isHealthy = await waitForHealthyDatabase();
        if (!isHealthy) return; // Abort cleanly — next foreground will retry

        // Phase 2: Token Reconnaissance
        const token = await getLocalSyncToken();
        const isAmnesiaWipe = token === null;

        if (isAmnesiaWipe) {
          Logger.info('[HydrationSync] AMNESIA DETECTED! Local DB wiped. Forcing Full Storage Rebuild...');
        } else {
          Logger.info(`[HydrationSync] Warm Boot. Last sync: ${new Date(token).toLocaleTimeString()}`);
        }

        // Phase 3: Cloud API Handshake
        // We use an imperative query execution so it only runs EXACTLY ONCE
        // per reconciliation cycle. Reactive `useQuery` would ping continuously.
        const payload = await convex.query(api.api.sync.delta.getDeltaPayload, {
          last_synced_at: token || undefined,
        });

        // Phase 4: Atomic Ingestion
        // If there are literally no changes, skip the heavy write to save battery.
        if (payload.tasks.length > 0 || payload.instances.length > 0) {
          Logger.info(
            `[HydrationSync] Ingesting: ${payload.tasks.length} tasks, ${payload.instances.length} instances.`
          );

          await ingestDeltaPayload(db, payload);

          // Phase 5: Hardware Re-Arm
          Logger.info('[HydrationSync] Firing Signals to Kotlin Hardware Kernel...');
          scheduleNextAlarm();
          Logger.info('[HydrationSync] Hardware fully synchronized!');
        } else {
          Logger.info('[HydrationSync] Fully synchronized. Zero mutation drift.');
        }

      } catch (e: any) {
        const errorStr = String(e);

        // ─────────────────────────────────────────────────────────────────
        // CONVEX VERSION MISMATCH RECOVERY
        // ─────────────────────────────────────────────────────────────────
        // When the Convex backend is redeployed (dev: `npx convex dev`
        // restart, prod: deployment rollover), its internal version counter
        // resets to 0. The client may still hold a stale version, causing:
        //   "Base version X passed up doesn't match the current version 0"
        //
        // RECOVERY STRATEGY:
        // 1. Wipe the sync token → forces Amnesia mode on next attempt.
        // 2. Release the mutex so the retry can acquire it.
        // 3. Retry after a short delay to let the WebSocket reconnect.
        // ─────────────────────────────────────────────────────────────────
        if (errorStr.includes('Base version') && errorStr.includes("doesn't match")) {
          Logger.warn('[HydrationSync] CONVEX VERSION MISMATCH. Backend redeployed. Wiping token...');
          
          await clearSyncToken();

          // Release mutex BEFORE scheduling retry
          isSyncingRef.current = false;
          lastSyncAttemptRef.current = 0; // Reset debounce to allow immediate retry

          if (isMountedRef.current) {
            setTimeout(() => {
              if (isMountedRef.current) executeReconciliation();
            }, 2000);
          }
          return; // Exit this cycle — retry will handle it
        }

        Logger.error('[HydrationSync] Synchronization Engine Catastrophic Failure:', e);
      } finally {
        // ── Release Mutex ──
        isSyncingRef.current = false;
        if (isMountedRef.current) {
          setIsSyncing(false);
          setIsFullyHydrated(true);
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. BOOT SYNC — Immediate execution on mount/login
    // ─────────────────────────────────────────────────────────────────────
    executeReconciliation();

    // ─────────────────────────────────────────────────────────────────────
    // 5. FOREGROUND RE-SYNC — AppState Listener
    // ─────────────────────────────────────────────────────────────────────
    // Android's aggressive memory management can kill the Convex WebSocket
    // and invalidate SQLite handles while the app is backgrounded. When
    // the user returns, the Convex SDK may silently reconnect, but our
    // local SQLite cache remains stale. This listener ensures we always
    // re-sync local state against the cloud on every foreground transition.
    //
    // The debounce guard (FOREGROUND_DEBOUNCE_MS) prevents redundant
    // syncs when the OS delivers multiple `active` events in rapid
    // succession (e.g., permission dialogs, camera intents).
    // ─────────────────────────────────────────────────────────────────────
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active' && isMountedRef.current) {
          Logger.info('[HydrationSync] Foreground transition detected. Initiating re-sync...');
          executeReconciliation();
        }
      }
    );

    // ── Cleanup ──
    return () => {
      isMountedRef.current = false;
      subscription.remove();
    };
  }, [session?.user?.id, convex, db]);

  return { isSyncing, isFullyHydrated, sessionStatus: !!session?.user?.id };
}
