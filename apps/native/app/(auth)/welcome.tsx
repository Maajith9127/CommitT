import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { AuthHeading, PrimaryButton, ScreenContainer } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { THEME } from "@/constants/theme";

export default function Welcome() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("User");
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (session?.user?.name) {
      setUserName(session.user.name);
    }
  }, [session]);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      await GoogleSignin.signOut();
      router.replace("/(auth)/signin");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (isPending) {
    return (
      <View style={{ flex: 1 }}>
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="grad_welcome_loading" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={THEME.colors.primary} stopOpacity="0.8" />
              <Stop offset="55%" stopColor={THEME.colors.pureBlack} stopOpacity="1" />
              <Stop offset="100%" stopColor={THEME.colors.pureBlack} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad_welcome_loading)" />
        </Svg>
        <ScreenContainer>
          <View className="flex-1 items-center justify-center">
            <Text style={{ color: THEME.colors.textMain, fontSize: THEME.typography.size.lg }}>Loading...</Text>
          </View>
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* PROGRAMMATIC ATMOSPHERIC GRADIENT */}
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="grad_welcome" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={THEME.colors.primary} stopOpacity="0.8" />
            <Stop offset="55%" stopColor={THEME.colors.pureBlack} stopOpacity="1" />
            <Stop offset="100%" stopColor={THEME.colors.pureBlack} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad_welcome)" />
      </Svg>

      <ScreenContainer>
        <View style={{ marginTop: THEME.spacing.xxxl * 2, alignItems: "center", paddingHorizontal: THEME.spacing.sm }}>
          <AuthHeading>
            Welcome to CommitT <Text style={{ color: THEME.colors.primary }}>{userName}</Text>
          </AuthHeading>
        </View>

        <View className="items-center">
          <Image
            source={require("../../assets/images/logo.png")}
            style={{ width: 430, height: 430, marginVertical: THEME.spacing.md }}
            resizeMode="contain"
          />
        </View>

        <View className="flex-1" />

        <View style={{ marginHorizontal: THEME.spacing.lg, marginBottom: THEME.spacing.lg }}>
          <PrimaryButton onPress={handleSignOut}>Sign Out</PrimaryButton>
        </View>

        <View style={{ marginHorizontal: THEME.spacing.lg, marginBottom: THEME.spacing.lg }}>
          <PrimaryButton onPress={() => router.push("/(main)/commits")}>Get started</PrimaryButton>
        </View>
      </ScreenContainer>
    </View>
  );
}

