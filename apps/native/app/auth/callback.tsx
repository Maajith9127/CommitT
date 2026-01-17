import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter, useRootNavigationState } from "expo-router";
import { authClient } from "@/lib/auth-client";

export default function AuthCallback() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return;

    const checkSession = async () => {
      console.log("OAuth callback loaded");

      const session = await authClient.getSession();
      console.log("Session result:", session);

      const timeout = setTimeout(() => {
        if (session?.data) {
          console.log("Login success → redirect to welcome");
          router.replace("/(auth)/welcome");
        } else {
          console.log("No session → back to signin");
          router.replace("/(auth)/signin");
        }
      }, 0);
      
      return () => clearTimeout(timeout);
    };

    checkSession();
  }, [rootNavigationState?.key]);

  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#4FA0FF" />
    </View>
  );
}
