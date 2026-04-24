import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useConvex } from "convex/react";
import { useSQLiteContext } from "expo-sqlite";
import { api } from "@commit/backend/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { getLocalSyncToken, ingestDeltaPayload, clearSyncToken } from "@/lib/sync-engine";
import { scheduleNextAlarm } from "@/modules/scheduler-module";
import { Logger } from "@/lib/logger";
import { syncLock } from "@/lib/sync-lock";
import { useResurrection } from "@/providers/ResurrectionProvider";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimum elapsed time (ms) between two consecutive sync cycles.
 */
const FOREGROUND_DEBOUNCE_MS = 10_000; // 10 seconds

/**
 * Maximum number of times the engine will retry a failed SQLite health check.
 */
const MAX_HEALTH_CHECK_RETRIES = 3;

/**
 * Delay (ms) between SQLite health check retries.
 */
const HEALTH_CHECK_RETRY_DELAY_MS = 1_500; // 1.5 seconds

/**
 * circuit breaker for consecutive "Amnesia" detections.
 */
const MAX_CONSECUTIVE_AMNESIA_ATTEMPTS = 3;

/**
 * ** PROACTIVE ZOMBIE THRESHOLD **
 *
 * Forces a full WebSocket resurrection if the app was backgrounded longer
 * than this threshold. This exists to kill "Zombie" Convex connections
 * that appear alive but have silently lost their server-side session.
 *
 * CRITICAL HISTORY (April 2026):
 * This was originally set to 5_000ms (5 seconds) for aggressive testing.
 * That value was CATASTROPHICALLY too low for production because the
 * permissions setup flow (camera → battery → overlay → accessibility)
 * sends the user to Android Settings and back 4+ times, each round-trip
 * taking 5-15 seconds. Every return triggered a Resurrection, spawning
 * a new ConvexReactClient without closing the old one. On Lenovo K12
 * Note's eMMC storage, 3 stacked orphaned clients corrupted the SQLite
 * WAL journal within 60 seconds, bricking the local database.
 *
 * 120 seconds (2 minutes) is the safe production value — long enough to
 * survive any Settings round-trip, short enough to catch genuine zombies.
 */
const ZOMBIE_THRESHOLD_MS = 120_000;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HOOK: useHydrationSync
 * ─────────────────────────────────────────────────────────────────────────────
 * This hook is the single source of truth for local↔cloud state reconciliation.
 * It sits at the absolute root of the application tree and is responsible for:
 * 
 * 1. BOOT SYNC: Detects if local SQLite cache is wiped or warm.
 * 2. FOREGROUND RE-SYNC: Detects foreground transition to heal stale state.
 * 3. VERSION MISMATCH RECOVERY: Wipes sync token if backend version resets.
 * 4. PROACTIVE RESURRECTION: Rebuilds WebSocket if background gap > threshold.
 */
export function useHydrationSync() {
  const convex = useConvex();
  const db = useSQLiteContext();
  const { data: session } = authClient.useSession();
  const { resurrect, iteration } = useResurrection();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFullyHydrated, setIsFullyHydrated] = useState(false);

  /** Refs (stable across renders) **/
  const isSyncingRef = useRef(false);
  const lastSyncAttemptRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  const lastActiveTimestampRef = useRef<number>(Date.now());
  const consecutiveAmnesiaRef = useRef<number>(0);

  useEffect(() => {
    isMountedRef.current = true;
    syncLock.reset();
    consecutiveAmnesiaRef.current = 0;

    if (!session?.user?.id) {
      setIsFullyHydrated(false);
      return () => { isMountedRef.current = false; };
    }

    /**
     * SQLITE HEALTH CHECK (with Retry)
     */
    async function waitForHealthyDatabase(): Promise<boolean> {
      for (let attempt = 1; attempt <= MAX_HEALTH_CHECK_RETRIES; attempt++) {
        try {
          await db.execAsync('PRAGMA user_version;');
          return true; // Connection is alive
        } catch (resourceErr: any) {
          const errStr = String(resourceErr);
          if (errStr.includes('malformed')) {
            Logger.error('[HydrationSync] DATABASE CORRUPTION DETECTED.');
            return false;
          }
          if (attempt < MAX_HEALTH_CHECK_RETRIES) {
            Logger.warn(`[HydrationSync] SQLite health check failed (attempt ${attempt}/${MAX_HEALTH_CHECK_RETRIES}). Retrying...`);
            await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_RETRY_DELAY_MS));
          }
        }
      }
      return false;
    }

    /**
     * CORE RECONCILIATION ENGINE
     */
    async function executeReconciliation(forceResurrect = false) {
      if (!isMountedRef.current) return;

      if (forceResurrect) {
        Logger.info(`[HydrationSync] Threshold exceeded. Forcing proactive resurrection...`);
        resurrect();
        return;
      }

      if (syncLock.isManualResyncActive) return;
      if (isSyncingRef.current) return;

      const now = Date.now();
      if (now - lastSyncAttemptRef.current < FOREGROUND_DEBOUNCE_MS) return;

      isSyncingRef.current = true;
      lastSyncAttemptRef.current = now;
      if (isMountedRef.current) setIsSyncing(true);

      try {
        const isHealthy = await waitForHealthyDatabase();
        if (!isHealthy) return;

        const token = await getLocalSyncToken();
        const isAmnesiaWipe = token === null;

        if (isAmnesiaWipe) {
          consecutiveAmnesiaRef.current += 1;
          if (consecutiveAmnesiaRef.current > MAX_CONSECUTIVE_AMNESIA_ATTEMPTS) {
            Logger.error(`[HydrationSync] CIRCUIT BREAKER TRIPPED at ${consecutiveAmnesiaRef.current} attempts.`);
            return;
          }
          Logger.info(`[HydrationSync] AMNESIA DETECTED! Local DB wiped.`);
        } else {
          consecutiveAmnesiaRef.current = 0;
          Logger.info(`[HydrationSync] Warm Boot. Last sync: ${new Date(token).toLocaleTimeString()}`);
        }

        /** Phase 3: Cloud API Handshake **/
        fetch('https://google.com', { mode: 'no-cors' }).catch(() => {});
        const CLOUD_QUERY_TIMEOUT_MS = 15_000;
        
        const queryPromise = convex.query(api.api.sync.delta.getDeltaPayload, {
          last_synced_at: token || undefined,
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('LAG_TIMEOUT')), CLOUD_QUERY_TIMEOUT_MS)
        );

        console.log(`[HydrationSync] Sending probe to Convex (Timeout: ${CLOUD_QUERY_TIMEOUT_MS}ms)...`);
        const payload = await Promise.race([queryPromise, timeoutPromise]) as any;

        /** Phase 4: Atomic Ingestion **/
        if (payload.tasks.length > 0 || payload.instances.length > 0) {
          Logger.info(`[HydrationSync] Ingesting: ${payload.tasks.length} tasks, ${payload.instances.length} instances.`);
          await syncLock.execute("Engine:Hydrate", async () => {
            await ingestDeltaPayload(db, payload);
            consecutiveAmnesiaRef.current = 0;
            scheduleNextAlarm();
          });
        } else {
          consecutiveAmnesiaRef.current = 0;
          Logger.info('[HydrationSync] Fully synchronized.');
        }

      } catch (e: any) {
        const errorStr = String(e);

        if (errorStr.includes('Base version') && errorStr.includes("doesn't match")) {
          Logger.warn('[HydrationSync] CONVEX VERSION MISMATCH. Backend redeployed.');
          await clearSyncToken();
          isSyncingRef.current = false;
          lastSyncAttemptRef.current = 0; 
          if (isMountedRef.current) {
            setTimeout(() => { if (isMountedRef.current) executeReconciliation(); }, 2000);
          }
          return;
        }

        if (errorStr.includes('LAG_TIMEOUT')) {
          /** 
           * SMART BLAME LOGIC:
           * Verify if the lag is due to a total lack of internet or a 'Zombie' app state.
           */
          try {
            const probe = await fetch('https://google.com', { method: 'HEAD' });
            const isInternetUp = probe.ok;

            if (isInternetUp) {
              if (iteration > 0) {
                Logger.error('[HydrationSync] PERSISTENT ZOMBIE DETECTED. Soft reset failed. Executing Nuclear Logout...');
                await authClient.signOut();
              } else {
                Logger.warn('[HydrationSync] REACHABLE ZOMBIE DETECTED. Triggering Soft Resurrection...');
                resurrect();
              }
            } else {
              Logger.info('[HydrationSync] Network is unreachable. Suppressing reset.');
            }
          } catch (pingErr) {
            Logger.info('[HydrationSync] Network appears down (ping failed). Suppressing reset.');
          }
          return;
        }

        Logger.error('[HydrationSync] Synchronization Engine Failure:', e);
      } finally {
        isSyncingRef.current = false;
        if (isMountedRef.current) {
          setIsSyncing(false);
          setIsFullyHydrated(true);
        }
      }
    }

    /** AppState Listener for Proactive Resurrection **/
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active' && isMountedRef.current) {
          const gap = Date.now() - lastActiveTimestampRef.current;
          const needsResurrection = gap > ZOMBIE_THRESHOLD_MS;
          
          Logger.info(`[HydrationSync] Foreground transition. Gap: ${Math.round(gap/1000)}s.`);
          executeReconciliation(needsResurrection);
        } else if (nextState === 'background') {
          lastActiveTimestampRef.current = Date.now();
        }
      }
    );

    executeReconciliation();

    return () => {
      isMountedRef.current = false;
      subscription.remove();
    };
  }, [session?.user?.id, convex, db]);

  return { isSyncing, isFullyHydrated, sessionStatus: !!session?.user?.id };
}
