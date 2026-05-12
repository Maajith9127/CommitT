import { useRootNavigationState, useRouter, usePathname } from "expo-router";
import { useEffect } from "react";
import { Image, StyleSheet, View, Text } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import { withUniwind } from "uniwind";

import { AuthHeading, AuthTitle, BrandTitle, PrimaryButton, ScreenContainer } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { THEME } from "@/constants/theme";

// UNIWINDS: Styled primitive wrappers for tailwind/uniwind integration
const UView = withUniwind(View);
const UText = withUniwind(Text);

/**
 * OnboardingIndex Component
 * -----------------------------------------------------------------------------
 * CORE RESPONSIBILITY: 
 * This is the entry point for the "Cold Start" lifecycle of the application. 
 * Its primary function is the atmospheric presentation of the CommitT brand
 * and the orchestration of initial session-based redirects.
 * 
 * ARCHITECTURE:
 * 1. Session Redirect: Forces navigation to dashboard if isAuthorized.
 * 2. Branding: Implements high-contrast, atmospheric onboarding visuals.
 * 3. Lifecycle Guard: Ensures rootNavigationState is ready before attempting redirects.
 */
export default function Index() {
  const router = useRouter();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const { data: session, isPending } = authClient.useSession();

  // --- 1. CORE ROUTING ENGINE ---
  // We execute a high-priority redirection sequence if an active session is detected.
  useEffect(() => {
    // ABORT: Navigation state or auth state not yet ready for evaluation.
    if (!rootNavigationState?.key || isPending) return;

    /**
     * CRITICAL BUGFIX: Pathname Guard
     * We only attempt a session-based redirect if the user is explicitly 
     * at the absolute root ("/"). This prevents accidental stack resets
     * when the app re-mounts from background while deep in sub-screens.
     */
    if (session && pathname === "/") {
      console.log("[CommitT] Session active at root. Transferring control to dashboard...");
      
      // const redirectTimer = setTimeout(() => {
      //   router.replace("/(main)/commits");
      // }, 0);

      // return () => clearTimeout(redirectTimer);
    }
  }, [session, isPending, router, rootNavigationState?.key, pathname]);

  // --- 2. RENDER: LOADING STATE (SKELETON) ---
  if (isPending) {
    return <LoadingSkeleton />;
  }

  // --- 3. RENDER: ONBOARDING VIEW ---
  return (
    <View style={{ flex: 1 }}>
      {/* PROGRAMMATIC ATMOSPHERIC GRADIENT */}
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={THEME.colors.primary} stopOpacity="0.8" />
            <Stop offset="55%" stopColor={THEME.colors.pureBlack} stopOpacity="1" />
            <Stop offset="100%" stopColor={THEME.colors.pureBlack} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad)" />
      </Svg>

      <ScreenContainer>
        {/* BRAND IDENTITY: Manifesto Block */}
        <Animated.View 
          entering={FadeInDown.duration(800).delay(200)}
          className="mt-12 items-center px-6"
        >
          <BrandTitle className="tracking-tighter">CommitT</BrandTitle>
          <AuthHeading className="text-center mt-2 opacity-80">
            Regain absolute control{"\n"}over your habit loops.
          </AuthHeading>
        </Animated.View>

        {/* VISUAL SYMBOL: Primary Brand Mark */}
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

        {/* PRIMARY ACTION: Session Initialization */}
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
    </View>
  );
}

/**
 * LoadingSkeleton
 * Lightweight UI placeholder for cold-boot auth checks.
 */
function LoadingSkeleton() {
  return (
    <View style={{ flex: 1 }}>
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="grad_skeleton" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={THEME.colors.primary} stopOpacity="0.8" />
            <Stop offset="55%" stopColor={THEME.colors.pureBlack} stopOpacity="1" />
            <Stop offset="100%" stopColor={THEME.colors.pureBlack} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad_skeleton)" />
      </Svg>
      <ScreenContainer>
        <UView className="flex-1 items-center justify-center">
          <UText className="text-white text-lg font-bold opacity-30 tracking-widest uppercase">
            Synchronizing...
          </UText>
        </UView>
      </ScreenContainer>
    </View>
  );
}
