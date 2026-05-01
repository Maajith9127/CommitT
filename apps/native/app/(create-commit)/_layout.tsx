import { Stack } from "expo-router";
import { usePresetHydration } from "@/hooks/usePresetHydration";

/**
 * CreateCommitLayout
 * ─────────────────────────────────────────────────────────────────────────────
 * Root layout for the commitment creation flow.
 *
 * HYDRATION POINT:
 *   This is where we trigger the one-shot preset hydration. By calling
 *   `usePresetHydration()` here (at the layout level), the store is populated
 *   BEFORE the user navigates to time-set.tsx, location-set.tsx, or any
 *   other screen that needs preset data. Zero loading spinners downstream.
 */
export default function CreateCommitLayout() {
  // ── Hydrate the PresetStore with saved locations & app blocklists ──
  usePresetHydration();

  return (
    <Stack
      screenOptions={{
        animation: "slide_from_right",
        animationDuration: 250,
        presentation: "transparentModal",
        headerShown: false,
        headerShadowVisible: false,
        headerTransparent: true,
        contentStyle: { backgroundColor: "black" },
      }}
    >
      <Stack.Screen name="time-set" options={{ animation: "fade" }} />
      <Stack.Screen name="location-set" options={{ animation: "fade" }} />
      <Stack.Screen name="choose" options={{ animation: "fade" }} />
      <Stack.Screen name="captcha-setup" options={{ animation: "fade" }} />
      <Stack.Screen name="picture-set" options={{ animation: "fade" }} />
    </Stack>
  );
}
