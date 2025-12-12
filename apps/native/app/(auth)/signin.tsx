import { ImageBackground, View } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { authClient } from "@/lib/auth-client";

import {
  ScreenContainer,
  PrimaryButton,
  AuthHeading,
  AuthFooterLegal,
} from "@/components/ui";

// Dismiss any stale browser sessions on load
WebBrowser.maybeCompleteAuthSession();

export default function Signin() {
  const router = useRouter();

  // 🔵 Google Login - Opens browser for account selection
  const handleGoogle = async () => {
    try {
      // Warm up browser for faster OAuth
      await WebBrowser.warmUpAsync();
      
      const redirectUri = Linking.createURL("(auth)/welcome");
      console.log("🔵 Redirect URI:", redirectUri);
      
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectUri,
      });
      
      console.log("🔵 OAuth result:", result);
      
      // Cool down browser
      await WebBrowser.coolDownAsync();
      
      if (result?.data) {
        console.log("✅ Google login successful!");
        router.replace("/(auth)/welcome");
      }
    } catch (err) {
      console.log("❌ Google Login Error:", err);
      await WebBrowser.coolDownAsync();
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/signinbg.png")}
      resizeMode="cover"
      style={{ flex: 1 }}
    >
      <ScreenContainer className="pt-30">

        {/* TITLE */}
        <AuthHeading className="mb-10 text-4xl">
          Get started with commitT
        </AuthHeading>

        {/* GOOGLE LOGIN */}
        <PrimaryButton className="mb-3 bg-[#1E1E1E]" onPress={handleGoogle}>
          Continue with Google
        </PrimaryButton>

        {/* OTHER OPTIONS — NOT IMPLEMENTED YET */}
        <PrimaryButton className="mb-3 bg-[#1E1E1E]" onPress={() => { }}>
          Continue with Facebook
        </PrimaryButton>

        <PrimaryButton className="mb-3 bg-[#1E1E1E]" onPress={() => { }}>
          Continue with Apple
        </PrimaryButton>

        <PrimaryButton className="mb-3 bg-[#1E1E1E]" onPress={() => { }}>
          Continue with Email
        </PrimaryButton>

        {/* SPACER */}
        <View className="flex-1 mb-5" />

        {/* FOOTER */}
        <AuthFooterLegal
          prefixText="By continuing, you accept our"
          privacyText="Privacy Policy"
          termsText="Terms & Conditions"
          onPressPrivacy={() => console.log("Privacy")}
          onPressTerms={() => console.log("Terms")}
          className="mb-5"
        />
      </ScreenContainer>
    </ImageBackground>
  );
}
