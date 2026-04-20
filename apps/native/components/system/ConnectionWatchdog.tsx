import { useConvex } from "convex/react";
import { AppState, type AppStateStatus } from "react-native";
import { useEffect, useRef } from "react";
import { Logger } from "@/lib/logger";
import { authClient } from "@/lib/auth-client";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CONNECTION WATCHDOG — Zombie WebSocket Resurrection
 * ─────────────────────────────────────────────────────────────────────────────
 * PROBLEM:
 * On Android (especially Lenovo/Motorola budget devices), the OS aggressively
 * kills WebSocket connections during extended sleep (6+ hours). When the app 
 * resumes, the Convex SDK's auto-reconnect fails silently:
 *   - useQuery hooks return CACHED data (reads appear to work)
 *   - useMutation calls timeout (writes fail — user can't create commits)
 *   - Server logs show ONLY HTTP auth calls, ZERO WebSocket traffic
 *
 * The user experience: "I can see my tasks but can't create new ones."
 * Previously required a full phone restart to fix.
 *
 * SOLUTION:
 * On every foreground resume, we probe the Convex client's connection state.
 * If the WebSocket has died (wasConnected but now isConnected=false, or
 * consecutive query timeouts detected), we force a reconnection by:
 *   1. Clearing the auth state (tears down the WebSocket)
 *   2. Waiting 500ms for cleanup
 *   3. Re-setting auth (forces a fresh WebSocket handshake)
 *
 * This achieves the same effect as a phone restart, without the restart.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function ConnectionWatchdog() {
  const client = useConvex();
  const lastHealthyRef = useRef<number>(Date.now());
  const isResurrectingRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
        if (nextState !== 'active') return;
        if (isResurrectingRef.current) return;

        try {
          // Check the Convex client's internal connection state
          const state = (client as any).connectionState?.();
          
          if (state) {
            const { isConnected, hasBeenConnected } = state;
            
            // Case 1: Was connected before but now disconnected → zombie socket
            if (hasBeenConnected && !isConnected) {
              const timeSinceHealthy = Date.now() - lastHealthyRef.current;
              
              // Only resurrect if we've been unhealthy for >30s
              // (avoids triggering during brief network transitions)
              if (timeSinceHealthy > 30_000) {
                Logger.warn(
                  `[ConnectionWatchdog] ZOMBIE SOCKET DETECTED! ` +
                  `Was connected but now dead (${Math.round(timeSinceHealthy / 1000)}s unhealthy). ` +
                  `Forcing WebSocket resurrection...`
                );
                await resurrectConnection(client);
              }
              return;
            }

            // Case 2: Connected and healthy — reset counters
            if (isConnected) {
              lastHealthyRef.current = Date.now();
              consecutiveFailuresRef.current = 0;
              return;
            }
          }

          // Case 3: Connection state unavailable or ambiguous → do a live probe
          // Try a lightweight query with a short timeout to see if the socket is alive
          const probeTimeout = 8_000; // 8 seconds
          const probePromise = (client as any).query?.('__health_check__').catch(() => null);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('PROBE_TIMEOUT')), probeTimeout)
          );

          try {
            await Promise.race([probePromise, timeoutPromise]);
            // If we get here (even with an error from Convex), the socket is alive
            lastHealthyRef.current = Date.now();
            consecutiveFailuresRef.current = 0;
          } catch (probeErr: any) {
            if (probeErr?.message === 'PROBE_TIMEOUT') {
              consecutiveFailuresRef.current += 1;
              Logger.warn(
                `[ConnectionWatchdog] Probe timeout #${consecutiveFailuresRef.current}. ` +
                `Socket may be dead.`
              );

              // After 2 consecutive probe failures, force resurrection
              if (consecutiveFailuresRef.current >= 2) {
                Logger.warn('[ConnectionWatchdog] 2+ consecutive probe failures. Forcing resurrection...');
                await resurrectConnection(client);
              }
            }
          }
        } catch (e) {
          // Watchdog must never crash the app
          Logger.error('[ConnectionWatchdog] Unexpected error:', e);
        }
      }
    );

    return () => subscription.remove();
  }, [client]);

  /**
   * Forces the Convex client to tear down and rebuild its WebSocket connection.
   * This is the "soft restart" — same effect as a phone restart but instant.
   */
  async function resurrectConnection(convexClient: any) {
    if (isResurrectingRef.current) return;
    isResurrectingRef.current = true;

    try {
      Logger.info('[ConnectionWatchdog] Step 1: Clearing auth to tear down zombie socket...');
      convexClient.clearAuth?.();

      // Give the SDK 500ms to fully tear down the old connection
      await new Promise(resolve => setTimeout(resolve, 500));

      Logger.info('[ConnectionWatchdog] Step 2: Re-setting auth to force fresh WebSocket...');
      // The ConvexBetterAuthProvider will detect the auth cleared state
      // and automatically re-authenticate, establishing a fresh WebSocket.
      // We trigger this by fetching a fresh session token.
      const session = await authClient.getSession();
      if (session?.data?.session) {
        Logger.info('[ConnectionWatchdog] Session valid. Auth provider will re-establish WebSocket.');
      } else {
        Logger.warn('[ConnectionWatchdog] No active session. User may need to re-login.');
      }

      // Reset health counters
      lastHealthyRef.current = Date.now();
      consecutiveFailuresRef.current = 0;

      Logger.info('[ConnectionWatchdog] WebSocket resurrection complete.');
    } catch (err) {
      Logger.error('[ConnectionWatchdog] Resurrection failed:', err);
    } finally {
      isResurrectingRef.current = false;
    }
  }

  return null;
}
