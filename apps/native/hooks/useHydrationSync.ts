import { useEffect, useState } from "react";
import { useConvex } from "convex/react";
import { useSQLiteContext } from "expo-sqlite";
import { api } from "@commit/backend/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { getLocalSyncToken, ingestDeltaPayload, clearSyncToken } from "@/lib/sync-engine";
import { scheduleNextAlarm } from "@/modules/scheduler-module";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PROD-LEVEL HYDRATION HOOK
 * ─────────────────────────────────────────────────────────────────────────────
 * This hook sits at the absolute root of the application.
 * The millisecond the user logs in (or boots the app while logged in), this 
 * hook silently negotiates with Convex and SQLite.
 * 
 * If it detects a 'Wipe' (amnesia), it triggers a full state download.
 * If it detects a 'Warm Boot', it does a silent delta patch in the background.
 */
export function useHydrationSync() {
  const convex = useConvex();
  const db = useSQLiteContext();
  const { data: session } = authClient.useSession();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFullyHydrated, setIsFullyHydrated] = useState(false);

  useEffect(() => {
    // 1. Authorization Gate: Never sync if user is completely logged out.
    if (!session?.user?.id) {
      setIsFullyHydrated(false);
      return;
    }

    let isMounted = true;

    async function executeReconciliation() {
      if (!isMounted) return;
      
      // Resource Guard: Ensure the SQLite context hasn't been closed/invalidated
      // during a hot-reload or unmount cycle before proceeding.
      // Also performs a lightweight corruption detection before attempting writes.
      try {
        await db.execAsync('PRAGMA user_version;'); 
      } catch (resourceErr: any) {
        const errStr = String(resourceErr);
        if (errStr.includes('malformed')) {
          console.error('🚨 [HydrationSync] DATABASE CORRUPTION DETECTED on health check. Aborting sync.');
          console.error('🚨 Recovery: Clear app data/cache and restart to trigger Amnesia rebuild.');
        } else {
          console.warn('[HydrationSync] SQLite Resource not available yet. Skipping cycle.');
        }
        return;
      }

      setIsSyncing(true);

      try {
        // 2. Token Reconnaissance
        const token = await getLocalSyncToken();
        const isAmnesiaWipe = token === null;

        if (isAmnesiaWipe) {
            console.log('\n[HydrationSync] AMNESIA DETECTED! Local DB wiped. Forcing Full Storage Rebuild...');
        } else {
            console.log(`\n[HydrationSync] Warm Boot. Checking for Deltas since ${new Date(token).toLocaleTimeString()}...`);
        }

        // 3. The Cloud API Handshake
        // We use an imperative query execution so it only runs EXACTLY ONCE per boot/auth cycle!
        // Reactive useQuery would ping continuously.
        const payload = await convex.query(api.api.sync.delta.getDeltaPayload, {
          last_synced_at: token || undefined,
        });

        // 4. The Atomic Ingestor
        // If there are literally no changes, we completely skip the heavy write to save battery!
        if (payload.tasks.length > 0 || payload.instances.length > 0) {
            console.log(`[HydrationSync] Downloaded ${payload.tasks.length} tasks and ${payload.instances.length} instances.`);
            
            await ingestDeltaPayload(db, payload);
            
            // 5. Hardware Re-Arm
            console.log('[HydrationSync] Firing Signals to Kotlin Hardware Kernel...');
            scheduleNextAlarm();
            console.log('[HydrationSync] Hardware fully synchronized!');
        } else {
            console.log('[HydrationSync] Fully synchronized. Zero mutation drift detected.');
        }

      } catch (e: any) {
        const errorStr = String(e);

        // ─────────────────────────────────────────────────────────────────────
        // CONVEX VERSION MISMATCH RECOVERY
        // ─────────────────────────────────────────────────────────────────────
        // When the Convex backend is redeployed (dev: `npx convex dev` restart,
        // prod: deployment rollover), its internal version counter resets to 0.
        // The client may still hold a stale version, causing:
        //   "Base version X passed up doesn't match the current version 0"
        //
        // RECOVERY STRATEGY:
        // 1. Wipe the sync token → forces Amnesia mode on next attempt.
        // 2. Wait for the Convex SDK to re-establish the WebSocket connection.
        // 3. Retry the full sync automatically.
        // ─────────────────────────────────────────────────────────────────────
        if (errorStr.includes('Base version') && errorStr.includes("doesn't match")) {
          console.warn('[HydrationSync] CONVEX VERSION MISMATCH detected. Backend was redeployed.');
          console.warn('[HydrationSync] Wiping sync token and scheduling retry...');
          
          await clearSyncToken();
          
          // Retry after a short delay to let the WebSocket reconnect
          if (isMounted) {
            setTimeout(() => {
              if (isMounted) executeReconciliation();
            }, 2000);
          }
          return; // Exit this cycle, retry will handle it
        }

        console.error('[HydrationSync] Synchronization Engine Catastrophic Failure:', e);
      } finally {
        if (isMounted) {
            setIsSyncing(false);
            setIsFullyHydrated(true);
        }
      }
    }

    executeReconciliation();

    return () => { isMounted = false; };
  }, [session?.user?.id, convex, db]);

  return { isSyncing, isFullyHydrated, sessionStatus: !!session?.user?.id };
}
