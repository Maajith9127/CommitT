import { Stack } from "expo-router";

export default function PenaltiesLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "transparentModal",
        animation: "fade",
        headerShown: false,
        contentStyle: { backgroundColor: "black" },
      }}
    />
  );
}
