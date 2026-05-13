import { Stack } from "expo-router";

export default function StrictModeLayout() {
  return (
    <Stack
      screenOptions={{
        animation: "slide_from_right",
        animationDuration: 250,
        presentation: "transparentModal",
        headerShown: false,
        contentStyle: { backgroundColor: "black" },
        gestureEnabled: false,
      }}
    />
  );
}
