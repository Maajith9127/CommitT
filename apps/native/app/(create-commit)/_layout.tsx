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
        presentation: "transparentModal",
        headerShown: false,
        headerShadowVisible: false,
        headerTransparent: true,
        contentStyle: { backgroundColor: "black" },
      }}
    />
  );
}
