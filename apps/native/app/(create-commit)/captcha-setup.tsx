import React from "react";
import { View, Pressable, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { HeaderTitle } from "@/components/ui/text";
import { CaptchaWaiverContent } from "@/components/ui/waivers/CaptchaWaiverContent";

const UView = withUniwind(View);
const UScrollView = withUniwind(ScrollView);
const UPressable = withUniwind(Pressable);

export default function CaptchaSetupScreen() {
  const router = useRouter();

  const handleConfirmCaptcha = (data: { count: number; difficulty: string }) => {
    // Navigate to the actual captcha task with params
    router.push({
      pathname: "/(create-commit)/waiver-captcha",
      params: { count: data.count, difficulty: data.difficulty },
    });
  };

  return (
    <UView className="flex-1 bg-black">
      {/* HEADER */}
      <UView className="flex-row items-center justify-between px-4 py-4 pt-12">
        <UView className="flex-row items-center">
          <UPressable onPress={() => router.back()} className="mr-6">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#E3E3E3" />
          </UPressable>
          <HeaderTitle className="text-xl">Solve Captchas</HeaderTitle>
        </UView>

        <UView className="flex-row items-center gap-6">
          <MaterialCommunityIcons name="help-circle-outline" size={24} color="#E3E3E3" />
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#E3E3E3" />
        </UView>
      </UView>

      <UScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          <UView className="mt-6">
            <CaptchaWaiverContent onConfirm={handleConfirmCaptcha} />
          </UView>
      </UScrollView>
    </UView>
  );
}
