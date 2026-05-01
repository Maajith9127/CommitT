import { Stack } from "expo-router";

export default function CaptchaLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
        presentation: "transparentModal",
        animation: "slide_from_right",
        animationDuration: 250,
      }}
    />
  );
}
