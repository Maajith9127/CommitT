import { Stack } from "expo-router";

export default function PenaltiesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
        presentation: "transparentModal",
        animation: "slide_from_right",
        animationDuration: 250,
      }}
    >
      <Stack.Screen name="embarrassing-photo" />
      <Stack.Screen name="email-setup" />
    </Stack>
  );
}
