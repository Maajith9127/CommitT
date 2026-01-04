import { Stack } from "expo-router";

export default function CreateCommitLayout() {
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
