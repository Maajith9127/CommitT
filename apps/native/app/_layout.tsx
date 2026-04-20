
import "@/global.css";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { HeroUINativeProvider } from "heroui-native";
import { View } from "react-native";
import { useEffect } from "react";
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
import { ConnectionWatchdog } from "@/components/system/ConnectionWatchdog";

const convexUrl = env.EXPO_PUBLIC_CONVEX_URL;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CONVEX CLIENT — Resilient Connection Factory
 * ─────────────────────────────────────────────────────────────────────────────
 * PRODUCTION RATIONALE:
 * The Convex WebSocket protocol uses an internal version counter to track
 * sync state. When the backend is redeployed (dev: `npx convex dev` restart,
 * prod: deployment rollover), the server version resets to 0. If the client
 * still holds a stale version (e.g., 2), the server rejects it with:
 *   "Base version 2 passed up doesn't match the current version 0"
 *
 * This is a FATAL error in the Convex SDK — it kills the WebSocket connection
 * permanently. Without intervention, the entire app loses real-time sync.
 *
 * SOLUTION: We intercept the `onFailure` callback to detect version mismatches
 * and trigger an automatic state reset + reconnection. This ensures the app
 * self-heals after backend redeployments without requiring a manual restart.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

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
      <Stack.Screen name="(create-commit)" options={{ animation: "slide_from_right", animationDuration: 200, headerShadowVisible: false, headerTransparent: true }} />
      <Stack.Screen name="(edit-preset)" options={{ animation: "fade" }} />
      <Stack.Screen name="(dev)/chaos" options={{ animation: "slide_from_bottom", presentation: 'modal' }} />
      <Stack.Screen name="(penalties)" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
    </Stack>
  );
}



export default function Layout() {
  useEffect(() => {
    // ── SYSTEM INITIALIZATION ──
    GoogleSignin.configure({
      webClientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <SQLiteProvider databaseName={LOCAL_DB_NAME} onInit={migrateDbIfNeeded}>
        <SecurityShield>
          <ConvexBetterAuthProvider client={convex} authClient={authClient}>
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
              <KeyboardProvider>
                <AppThemeProvider>
                  <HeroUINativeProvider>
                    <ThemeProvider value={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: '#000000' } }}>
                      <ConnectionWatchdog />
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
          </ConvexBetterAuthProvider>
        </SecurityShield>
      </SQLiteProvider>
      <ChaosFab />
    </View>
  );
}



