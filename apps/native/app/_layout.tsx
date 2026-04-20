import "@/global.css";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { HeroUINativeProvider } from "heroui-native";
import { View } from "react-native";
import { useEffect, useMemo } from "react";
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
import { ResurrectionProvider, useResurrection } from "@/providers/ResurrectionProvider";

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
      <Stack.Screen name="(create-commit)" options={{ animation: "slide_from_right", animationDuration: 200, headerShadowVisible: false, headerTransparent: true }} />
      <Stack.Screen name="(edit-preset)" options={{ animation: "fade" }} />
      <Stack.Screen name="(dev)/chaos" options={{ animation: "slide_from_bottom", presentation: 'modal' }} />
      <Stack.Screen name="(penalties)" options={{ animation: "slide_from_right" }} />
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
          <SecurityShield>
            <ConvexClientWrapper>
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
            </ConvexClientWrapper>
          </SecurityShield>
        </SQLiteProvider>
        <ChaosFab />
      </View>
    </ResurrectionProvider>
  );
}
