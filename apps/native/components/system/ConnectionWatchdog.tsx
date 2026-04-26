/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚰️  DEPRECATED — CONNECTION WATCHDOG (April 2026)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This component has been REMOVED from the provider tree and should NOT be
 * imported or used anywhere.
 *
 * REASON FOR DEPRECATION:
 * The ConnectionWatchdog was a legacy system that attempted to detect zombie
 * WebSocket connections and fix them by calling `convexClient.clearAuth()`
 * directly. This approach was fundamentally broken:
 *
 *   1. It BYPASSED the ResurrectionProvider — The centralized lifecycle
 *      system (ResurrectionProvider → ConvexClientWrapper) creates a
 *      brand-new ConvexReactClient on resurrection. The Watchdog instead
 *      called clearAuth() on the SAME dead client, leaving it in a
 *      half-alive state that corrupted subsequent queries.
 *
 *   2. It KILLED in-flight Sagas — Calling clearAuth() mid-mutation
 *      destroyed the WebSocket transport while Sagas were waiting for
 *      Convex responses, causing 15-second timeouts, ROLLBACK cascades,
 *      and "Local Sync Failed" modals.
 *
 *   3. It PANICKED during cold starts — Convex serverless deployments
 *      naturally go to sleep after inactivity. The Watchdog's 16-second
 *      probe timeout (2x 8s probes) was far too aggressive for the 
 *      10-30 second cold-start window. It would nuke auth, and when
 *      the server finally woke up, the first query hit a "Server Error"
 *      (auth token cleared) → RED SCREEN crash.
 *
 *   4. It probed a NON-EXISTENT function — The `__health_check__` query
 *      was never deployed to the Convex backend. The probe always failed
 *      with "function not found", making it useless as a health signal.
 *
 * REPLACEMENT:
 * All zombie socket detection is now handled by `useHydrationSync`
 * (inside the HydrationEngine), which already:
 *   - Monitors foreground transitions via AppState
 *   - Sends real Convex queries as health probes
 *   - Calls `resurrect()` from the ResurrectionProvider on failure
 *   - Creates a brand-new ConvexReactClient (the correct fix)
 *
 * DO NOT REVIVE THIS COMPONENT. If you need connection monitoring,
 * add it to the ResurrectionProvider or useHydrationSync instead.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Intentionally empty. This file is kept as a tombstone to prevent
// accidental re-creation of the same anti-pattern.
