import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ImageBackground, ScrollView, Text, TouchableOpacity, View } from "react-native";
import {
  AuthFooterLegal,
  AuthHeading,
  Input,
  PrimaryButton,
  ScreenContainer,
} from "@/components/ui";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { useMutation } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import type { AuthFormErrors, AuthMode } from "./types";
import { Platform } from "react-native";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<AuthFormErrors>({});

  const [showHardwareLockedModal, setShowHardwareLockedModal] = useState(false);
  const [hardwareLockedMessage, setHardwareLockedMessage] = useState("");

  // ── HARDWARE BOND GATEKEEPER ──
  const syncHardwareBond = useMutation(api.api.security.bond.syncHardwareBond);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: AuthFormErrors = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (mode === "signup") {
      if (!confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (confirmPassword !== password) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailAuth = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      let result: any;
      if (mode === "signin") {
        result = await authClient.signIn.email({
          email,
          password,
        });
      } else {
        result = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0],
        });
      }

      if (result?.data) {
        // ── STAGE 2: HARDWARE SECURITY AUDIT ──
        const deviceId = Platform.OS === "android" 
          ? await Application.getAndroidId() 
          : "ios-dev-device"; // Placeholder for iOS

        // ── STAGE 3: THE MARRIAGE HANDSHAKE (RETRY LOOP) ──
        let audit;
        let retries = 3;
        
        while (retries > 0) {
          audit = await syncHardwareBond({ deviceId });
          
          if (audit?.retry) {
            console.log(`[Auth] Backend session syncing, retrying... (${retries} left)`);
            await new Promise(resolve => setTimeout(resolve, 800));
            retries--;
            continue;
          }
          break; // It either succeeded or definitively failed
        }

        if (audit && !audit.success) {
          // ── INSTANT PURGE ──
          // If the marriage is invalid, we destroy the session immediately
          // before the app can navigate to the main layout.
          await authClient.signOut();
          try { await GoogleSignin.signOut(); } catch (e) {}
          
          setHardwareLockedMessage(audit.reason || "This hardware is currently restricted.");
          setShowHardwareLockedModal(true);
          return;
        }

        router.replace("/(auth)/welcome");
      } else {
        setErrors({ general: "Authentication failed. Please try again." });
      }
    } catch (err: unknown) {
      console.log(`${mode} error:`, err);
      const errorMessage = (err as Error)?.message || "An error occurred. Please try again.";
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setErrors({});

    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.type === "success") {
        const tokens = await GoogleSignin.getTokens();
        const { idToken, accessToken } = tokens;

        const result = await authClient.signIn.social({
          provider: "google",
          idToken: {
            token: idToken,
            accessToken: accessToken,
          },
        });

        if (result?.data) {
          // ── STAGE 2: HARDWARE SECURITY AUDIT ──
          const deviceId = Platform.OS === "android" 
            ? await Application.getAndroidId() 
            : "ios-dev-device";

          // ── THE MARRIAGE HANDSHAKE (RETRY LOOP) ──
          let audit;
          let retries = 3;
          
          while (retries > 0) {
            audit = await syncHardwareBond({ deviceId });
            
            if (audit?.retry) {
              await new Promise(resolve => setTimeout(resolve, 800));
              retries--;
              continue;
            }
            break;
          }

          if (audit && !audit.success) {
            await authClient.signOut();
            try { await GoogleSignin.signOut(); } catch (e) {}
            
            setHardwareLockedMessage(audit.reason || "This hardware is currently restricted.");
            setShowHardwareLockedModal(true);
            return;
          }

          router.replace("/(auth)/welcome");
        }
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      setErrors({ general: "Google sign-in failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
  };

  return (
    <ImageBackground
      source={require("../../assets/images/signinbg.png")}
      resizeMode="cover"
      style={{ flex: 1 }}
    >
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mt-30">
            <AuthHeading className="mb-10 text-4xl">Get started with commitT</AuthHeading>
          </View>

          <View className="mb-6 flex-row rounded-4xl bg-[#1A1A1A] p-1">
            <TouchableOpacity
              className={`flex-1 rounded-3xl px-4 py-3 ${mode === "signin" ? "bg-[#4FA0FF]" : ""}`}
              onPress={() => handleModeChange("signin")}
            >
              <Text
                className={`text-center font-semibold text-lg ${mode === "signin" ? "text-white" : "text-gray-400"}`}
              >
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 rounded-3xl px-4 py-3 ${mode === "signup" ? "bg-[#4FA0FF]" : ""}`}
              onPress={() => handleModeChange("signup")}
            >
              <Text
                className={`text-center font-semibold text-lg ${mode === "signup" ? "text-white" : "text-gray-400"}`}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            <Input
              placeholder="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email && <Text className="mt-1 ml-4 text-red-400 text-sm">{errors.email}</Text>}
          </View>

          <View className="mb-4">
            <Input
              placeholder="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.password && (
              <Text className="mt-1 ml-4 text-red-400 text-sm">{errors.password}</Text>
            )}
          </View>

          {mode === "signup" && (
            <View className="mb-6">
              <Input
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.confirmPassword && (
                <Text className="mt-1 ml-4 text-red-400 text-sm">{errors.confirmPassword}</Text>
              )}
            </View>
          )}

          {errors.general && (
            <Text className="mb-4 text-center text-red-400 text-sm">{errors.general}</Text>
          )}

          <PrimaryButton className="mb-6" onPress={loading ? undefined : handleEmailAuth}>
            {loading ? "Please wait..." : mode === "signin" ? "Continue" : "Sign Up"}
          </PrimaryButton>

          <View className="mb-6 flex-row items-center">
            <View className="h-px flex-1 bg-gray-600" />
            <Text className="mx-4 text-gray-400">or</Text>
            <View className="h-px flex-1 bg-gray-600" />
          </View>

          <PrimaryButton className="mb-3 bg-[#1E1E1E]" onPress={handleGoogle}>
            {loading ? "Signing in..." : "Continue with Google"}
          </PrimaryButton>

          <View className="mb-5 flex-1" />

          <AuthFooterLegal
            prefixText="By continuing, you accept our"
            privacyText="Privacy Policy"
            termsText="Terms & Conditions"
            onPressPrivacy={() => console.log("Privacy")}
            onPressTerms={() => console.log("Terms")}
            className="mb-5"
          />
        </ScrollView>
      </ScreenContainer>

      <ConfirmationModal
        visible={showHardwareLockedModal}
        title={hardwareLockedMessage}
        confirmText="OK"
        confirmColor="#4FA0FF"
        singleButton={true}
        onConfirm={() => setShowHardwareLockedModal(false)}
        onCancel={() => setShowHardwareLockedModal(false)}
      />

    </ImageBackground>
  );
}
