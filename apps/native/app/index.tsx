import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, ImageBackground, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import { withUniwind } from "uniwind";
import { AuthHeading, AuthTitle, PrimaryButton, ScreenContainer } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

const UView = withUniwind(View);
const UText = withUniwind(Text);

/**
 * OnboardingIndex: The Atmospheric Entrance
 * -----------------------------------------------------------------------------
 * This is the cold-start entry point. It uses heavy brand imagery and 
 * high-contrast messaging to define the app's 'Strict Mode' personality.
 */
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
        className="flex-1"
      >
        <ScreenContainer>
          <UView className="flex-1 items-center justify-center">
            <UText className="text-white text-lg font-bold opacity-50">Calibrating Loops...</UText>
          </UView>
        </ScreenContainer>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/onboarding.png")}
      resizeMode="cover"
      className="flex-1"
    >
      <ScreenContainer>
        {/* ── MANIFESTO BLOCK ── */}
        <Animated.View 
          entering={FadeInDown.duration(800).delay(200)}
          className="mt-12 items-center px-6"
        >
          <AuthTitle className="text-5xl tracking-tighter">CommitT</AuthTitle>
          <AuthHeading className="text-center mt-2 opacity-80">
            Regain absolute control{"\n"}over your habit loops.
          </AuthHeading>
        </Animated.View>

        {/* ── LOGO ENTITY ── */}
        <Animated.View 
          entering={ZoomIn.duration(1000).delay(400)}
          className="items-center justify-center flex-1"
        >
          <Image
            source={require("../assets/images/logo.png")}
            style={{ width: 400, height: 400 }}
            resizeMode="contain"
          />
        </Animated.View>

        <View className="flex-1" />

        {/* ── ENGAGEMENT CONDUIT ── */}
        <Animated.View 
          entering={FadeInUp.duration(800).delay(600)}
          className="px-6 pb-12"
        >
          <PrimaryButton 
            className="shadow-2xl shadow-[#4FA0FF]/30"
            onPress={() => router.push("/(auth)/signin")}
          >
            INITIALIZE SESSION
          </PrimaryButton>
          <UText className="mt-6 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">
            Identity verification required
          </UText>
        </Animated.View>
      </ScreenContainer>
    </ImageBackground>
  );
}
