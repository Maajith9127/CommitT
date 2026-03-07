import { Stack } from "expo-router";

export default function PenaltiesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "black" },
        animation: "slide_from_right",
        animationDuration: 200,
      }}
    >
      <Stack.Screen 
        name="embarrassing-photo" 
        options={{ 
          presentation: "card",
          animation: "slide_from_right"
        }} 
      />
      <Stack.Screen 
        name="email-setup" 
        options={{ 
          presentation: "card",
          animation: "slide_from_right"
        }} 
      />
    </Stack>
  );
}
