import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ImageBackground, Text, View } from "react-native";
import { AuthHeading, PrimaryButton, ScreenContainer } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

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
      <ImageBackground
        source={require("../../assets/images/signinbg.png")}
        resizeMode="cover"
        style={{ flex: 1 }}
      >
        <ScreenContainer>
          <View className="flex-1 items-center justify-center">
            <Text className="text-white text-lg">Loading...</Text>
          </View>
        </ScreenContainer>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require("../../assets/images/signinbg.png")}
      resizeMode="cover"
      style={{ flex: 1 }}
    >
      <ScreenContainer>
        <View className="mt-12 items-center px-3">
          <AuthHeading>
            Welcome to CommitT <Text style={{ color: "#4FA0FF" }}>{userName}</Text>
          </AuthHeading>
        </View>

        <View className="items-center">
          <Image
            source={require("../../assets/images/logo.png")}
            style={{ width: 430, height: 430, marginVertical: 10 }}
            resizeMode="contain"
          />
        </View>

        <View className="flex-1" />

        <View className="mx-4 mb-4">
          <PrimaryButton onPress={handleSignOut}>Sign Out</PrimaryButton>
        </View>

        <View className="mx-4 mb-4">
          <PrimaryButton onPress={() => router.push("/(main)/commits")}>Get started</PrimaryButton>
        </View>
      </ScreenContainer>
    </ImageBackground>
  );
}
