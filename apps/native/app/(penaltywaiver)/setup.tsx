import React, { useRef } from "react"; // Switched from useState/useCallback to useRef
import { View, ScrollView } from "react-native";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";
import { HeaderTitle, AuthTitle } from "@/components/ui/text";
import { ScreenHeader } from "@/components/ui";
import { PrimaryButton } from "@/components/ui/button";
import { CaptchaWaiverContent } from "@/components/ui/waivers/CaptchaWaiverContent";
import { useWaiverSync } from "@/hooks/commits/useWaiverSync";

const UView = withUniwind(View);
const UScrollView = withUniwind(ScrollView);

/**
 * CaptchaSetupScreen
 * 
 * PATTERN: Buffered Commit
 * We don't want every tiny slider move to hit our global Zustand store (performance lag).
 * Instead:
 * 1. The Child (CaptchaWaiverContent) manages local high-frequency state.
 * 2. The Parent (this screen) uses a 'ref' to always keep a pointer to the current UI values.
 * 3. We only 'Commit' to the Global Store when the user clicks 'Confirm'.
 */
export default function CaptchaSetupScreen() {
  const router = useRouter();
  const { waiver, setWaiver } = useWaiverSync();
  
  // A 'ref' is perfect here: It saves the latest data without triggering 
  // any expensive re-renders on this screen while the user drags a slider.
  const latestDataRef = useRef({
    count: waiver?.config?.count || 5, 
    difficulty: waiver?.config?.difficulty || "medium" 
  });

  const handleConfirm = () => {
    // Sync the final 'buffered' state to the global store
    setWaiver({
      type: "captcha",
      config: latestDataRef.current,
      deadline_minutes: 60,
    });
    
    console.log("[Waiver] Final Commit:", latestDataRef.current);
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
          <CaptchaWaiverContent 
            initialCount={latestDataRef.current.count}
            initialDifficulty={latestDataRef.current.difficulty}
            onChange={(data) => { latestDataRef.current = data; }} 
          />
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
