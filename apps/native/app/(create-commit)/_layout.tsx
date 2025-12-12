import { Stack } from "expo-router";

export default function CreateCommitLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "modal", // ❤️ MAGIC LINE
        animation: "fade_from_bottom",
        headerShown: false,
      }}
    />
  );
}
