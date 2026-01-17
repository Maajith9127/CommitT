import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, ImageBackground, Text, View } from "react-native";
import { AuthHeading, AuthTitle, PrimaryButton, ScreenContainer } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export default function Index() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    // Wait for navigation and session state to be ready
    if (!rootNavigationState?.key || isPending) return;

    if (session) {
      const timeout = setTimeout(() => {
        router.replace("/(main)/commits");
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [session, isPending, router, rootNavigationState?.key]);

  if (isPending) {
    return (
      <ImageBackground
        source={require("../assets/images/onboarding.png")}
        resizeMode="cover"
        style={{ flex: 1 }}
      >
        <ScreenContainer className="">
          <View className="flex-1 items-center justify-center">
            <Text className="text-white text-lg">Loading...</Text>
          </View>
        </ScreenContainer>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/onboarding.png")}
      resizeMode="cover"
      style={{ flex: 1 }}
    >
      <ScreenContainer className="">
        <View className="mt-9 items-center px-3">
          <AuthTitle>Welcome to CommitT</AuthTitle>
          <AuthHeading>Regain control over your habit loops</AuthHeading>
        </View>

        <View className="mb-1 items-center">
          <Image
            source={require("../assets/images/logo.png")}
            style={{
              width: 370,
              height: 370,
              marginVertical: 10,
            }}
            resizeMode="contain"
          />
        </View>

        <View className="flex-1" />

        <View className="mb-6">
          <PrimaryButton onPress={() => router.push("/(auth)/signin")}>Let's Go!!</PrimaryButton>
        </View>
      </ScreenContainer>
    </ImageBackground>
  );
}
