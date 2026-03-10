import { Stack } from "expo-router";

export default function StrictModeLayout() {
  return (
    <Stack
      screenOptions={{
        animation: "fade",
        presentation: "transparentModal",
        headerShown: false,
        contentStyle: { backgroundColor: "black" },
        gestureEnabled: false,
      }}
    />
  );
}
