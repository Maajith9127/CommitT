import "@/global.css";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "@/lib/auth-client";

import { Stack, useRouter } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller"; // Disabled for Expo Go
import { AppThemeProvider } from "@/contexts/app-theme-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? "";
const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});

function OnboardingGate() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const seen = await AsyncStorage.getItem("hasSeenOnboarding");
      if (!seen) {
        router.replace("/(auth)/intro");
      }
      setChecking(false);
    };

    check();
  }, []);

  if (checking) return null;
  return null;
}

export default function RootLayout() {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <AppThemeProvider>
            <HeroUINativeProvider>
              <OnboardingGate />

              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "slide_from_right",
                  gestureEnabled: true,
                  animationDuration: 250,
                }}
              >
                <Stack.Screen
                  name="(auth)"
                  options={{
                    animation: "fade",
                  }}
                />
                <Stack.Screen
                  name="(main)"
                  options={{
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="(commit-create)"
                  options={{
                    presentation: "modal",
                    animation: "slide_from_bottom",
                  }}
                />
              </Stack>
            </HeroUINativeProvider>
          </AppThemeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ConvexBetterAuthProvider>
  );
}
