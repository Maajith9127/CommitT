import React, { useState, useCallback } from "react";
import { View, ScrollView } from "react-native";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";
import { HeaderTitle, AuthTitle } from "@/components/ui/text";
import { ScreenHeader } from "@/components/ui";
import { PrimaryButton } from "@/components/ui/button";
import { CaptchaWaiverContent } from "@/components/ui/waivers/CaptchaWaiverContent";

const UView = withUniwind(View);
const UScrollView = withUniwind(ScrollView);

export default function CaptchaSetupScreen() {
  const router = useRouter();
  const [captchaData, setCaptchaData] = useState({ count: 5, difficulty: "medium" });

  const handleWaiverChange = useCallback((data: { count: number; difficulty: string }) => {
    setCaptchaData(data);
  }, []);

  const handleConfirm = () => {
    // Navigate back or to the next step
    console.log("Final Captcha Config:", captchaData);
    router.back();
  };

  return (
    <UView className="flex-1 bg-black">
      <UScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* HEADER SECTION */}
        <ScreenHeader>
          <UView className="mt-12 mb-2">
            <HeaderTitle className="text-3xl text-green-400">Solve Captchas</HeaderTitle>
          </UView>

          <AuthTitle className="mt-1 mb-0 text-left text-gray-400">
            Solve these many number of captchas to waive of a penalty if occurred
          </AuthTitle>
        </ScreenHeader>

        {/* CONTENT SECTION */}
        <UView className="px-4 mt-6">
          <CaptchaWaiverContent onChange={handleWaiverChange} />
          {/* Spacer to allow scrolling past the sticky button when content is long */}
          <View style={{ height: 120 }} />
        </UView>
      </UScrollView>

      {/* STICKY BOTTOM BUTTON SECTION */}
      <UView className="absolute bottom-0 left-0 right-0 bg-black px-4 py-4 pb-8 border-t border-[#1A1A1A]">
        <PrimaryButton 
          onPress={handleConfirm}
          className="bg-[#4CD964]"
          textClassName="text-white font-bold"
        >
          Confirm Captchas
        </PrimaryButton>
      </UView>
    </UView>
  );
}
