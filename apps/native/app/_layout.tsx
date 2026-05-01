import "@/global.css";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { HeroUINativeProvider } from "heroui-native";
import { View } from "react-native";
import { useEffect, useMemo, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AppThemeProvider } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { LOCAL_DB_NAME, migrateDbIfNeeded } from "@/lib/local-db";
import { env } from "@commit/env/native";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { HealOverlay } from "@/components/ui/modal/HealOverlay";
import { ChaosFab } from "@/components/dev/ChaosFab";
import { DbDebugFab } from "@/components/dev/DbDebugFab";
import { AlarmFab } from "@/components/ui/buttons/AlarmFab";
import { SecurityShield } from "@/components/system/SecurityShield";
import { HydrationEngine } from "@/components/system/HydrationEngine";
import { ResurrectionProvider, useResurrection } from "@/providers/ResurrectionProvider";
import { Logger } from "@/lib/logger";

// ── GLOBAL CONSOLE HIJACK ──
// Activate BEFORE anything else runs. This intercepts every console.log,
// console.warn, and console.error call across the entire app and writes
// them to persistent daily log files on disk. Critical for Release builds
// where logcat access is unavailable.
Logger.installPolyfill();

const convexUrl = env.EXPO_PUBLIC_CONVEX_URL;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPONENT: ConvexClientWrapper
 * ─────────────────────────────────────────────────────────────────────────────
 * An internal wrapper designed to consume the ResurrectionContext.
 * 
 * It manages the lifecycle of the ConvexReactClient, ensuring that whenever 
 * a 'Resurrection' (system reset) is triggered, the client is destroyed 
 * and re-instantiated from scratch to clear stale WebSocket states.
 */
function ConvexClientWrapper({ children }: { children: React.ReactNode }) {
  const { iteration } = useResurrection();

  /**
   * ** CRITICAL: Stale Client Reference for Graceful Teardown **
   *
   * On slower eMMC hardware (e.g. Lenovo K12 Note), abandoning a ConvexReactClient
   * without calling `.close()` leaves orphaned WebSocket connections and native
   * SQLite file descriptors alive in the JS garbage collector's finalizer queue.
   * When a new client is spawned (via Resurrection), these ghost handles overlap
   * with the new client's handles on the same `commit.db` file, corrupting the
   * WAL journal and producing fatal `database disk image is malformed` errors.
   *
   * Samsung's faster UFS storage masks this because transactions complete before
   * the overlap window, but eMMC's slower I/O makes the race catastrophic.
   *
   * FIX: We store a ref to the previous client and explicitly `.close()` it
   * in the useEffect cleanup before the new client takes over.
   */
  const previousClientRef = useRef<ConvexReactClient | null>(null);

  const convexClient = useMemo(() => {
    const instanceId = Math.random().toString(36).substring(7).toUpperCase();
    console.log(`
      ╔══════════════════════════════════════════════════════════╗
      ║ ⚡️ CONVEX REBIRTH: Spawning fresh client...              ║
      ║ 🆔 ID: ${instanceId}                                     ║
      ║ 🔄 ITERATION: ${iteration}                               ║
      ╚══════════════════════════════════════════════════════════╝
    `);
    return new ConvexReactClient(convexUrl, {
      unsavedChangesWarning: false,
    });
  }, [iteration]);

  useEffect(() => {
    /**
     * ** Graceful Client Lifecycle Management **
     *
     * If a previous client exists from a prior iteration, close it NOW
     * before the new client begins its first query. This ensures exactly
     * ONE active WebSocket + connection pool exists at any given time,
     * eliminating the file-descriptor overlap that corrupts the WAL.
     */
    if (previousClientRef.current && previousClientRef.current !== convexClient) {
      console.log('[ConvexClientWrapper] Closing stale client from previous iteration.');
      previousClientRef.current.close();
    }
    previousClientRef.current = convexClient;

    return () => {
      /**
       * ** Unmount Cleanup (Defensive) **
       * If this wrapper fully unmounts (e.g., app teardown), close the
       * active client to release all native resources immediately rather
       * than waiting for GC finalization.
       *
       * The setTimeout + try/catch prevents the "ConvexReactClient has
       * already been closed" red screen crash. When SecurityShield flips
       * to violation mode, it unmounts this tree mid-render — Convex's
       * internal ConvexAuthStateLastEffect still has queued state updates
       * that race against the synchronous .close(). The 100ms delay lets
       * React's pending render cycle drain before we pull the plug.
       */
      const clientToClose = convexClient;
      setTimeout(() => {
        try { clientToClose.close(); } catch {}
      }, 100);
    };
  }, [convexClient]);

  return (
    <ConvexBetterAuthProvider client={convexClient} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * VIEW: StackLayout
 * ─────────────────────────────────────────────────────────────────────────────
 * Primary navigation structure for the application.
 */
function StackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 200,
        gestureEnabled: true,
        contentStyle: { backgroundColor: "black" },
      }}
    >
      <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
      <Stack.Screen name="(create-commit)" options={{ presentation: "transparentModal", animation: "slide_from_right", animationDuration: 250, headerShadowVisible: false, headerTransparent: true }} />
      <Stack.Screen name="(edit-preset)" options={{ animation: "fade" }} />
      <Stack.Screen name="(dev)/chaos" options={{ animation: "slide_from_bottom", presentation: 'modal' }} />
      <Stack.Screen name="(penalties)" options={{ presentation: "transparentModal", animation: "slide_from_right", animationDuration: 250 }} />
      <Stack.Screen name="(penaltywaiver)" options={{ presentation: "transparentModal", animation: "slide_from_right", animationDuration: 250 }} />
      <Stack.Screen name="(settings)" options={{ presentation: "transparentModal", animation: "slide_from_right", animationDuration: 250 }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
    </Stack>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ENTRY POINT: Layout
 * ─────────────────────────────────────────────────────────────────────────────
 * Root layout component responsible for initializing the provider tree.
 * Orchestrates security, data sync, persistence, and global UI components.
 */
export default function Layout() {
  useEffect(() => {
    // ── SYSTEM INITIALIZATION ──
    GoogleSignin.configure({
      webClientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  return (
    <ResurrectionProvider>
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <SQLiteProvider databaseName={LOCAL_DB_NAME} onInit={migrateDbIfNeeded}>
          <ConvexClientWrapper>
            <SecurityShield>
              <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
                <KeyboardProvider>
                  <AppThemeProvider>
                    <HeroUINativeProvider>
                      <ThemeProvider value={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: '#000000' } }}>
                        <HydrationEngine />
                        <StackLayout />
                        <HealOverlay />
                      </ThemeProvider>
                      <DbDebugFab />
                      <AlarmFab />
                    </HeroUINativeProvider>
                  </AppThemeProvider>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </SecurityShield>
          </ConvexClientWrapper>
        </SQLiteProvider>
        <ChaosFab />
      </View>
    </ResurrectionProvider>
  );
}
