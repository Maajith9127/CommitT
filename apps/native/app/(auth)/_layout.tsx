import { Stack } from "expo-router";
import { useEffect } from "react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { env } from "@commit/env/native";

export default function AuthLayout() {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="signin" />
      <Stack.Screen name="welcome" />
    </Stack>
  );
}
