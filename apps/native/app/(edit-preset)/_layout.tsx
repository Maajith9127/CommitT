import { Stack } from "expo-router";

/**
 * EditPresetLayout
 * ─────────────────────────────────────────────────────────────────────────────
 * Root layout for the preset editing flow.
 * 
 * Since this is separated from the main creation flow, we use a distinct
 * animation pattern (fade) to provide visual context that the user is 
 * managing their library, not building a specific commitment instance.
 */
export default function EditPresetLayout() {
  return (
    <Stack
      screenOptions={{
        animation: "fade",
        presentation: "transparentModal",
        headerShown: false,
        contentStyle: { backgroundColor: "black" },
      }}
    />
  );
}
