import React, { useRef } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { ActionScreenLayout, HeaderTitle, AuthTitle, PrimaryButton } from "@/components/ui";
import { CaptchaWaiverContent } from "@/components/ui/waivers/CaptchaWaiverContent";
import { useWaiverSync } from "@/hooks/commits/useWaiverSync";

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
    router.push("/(create-commit)/final");
  };

  return (
    <ActionScreenLayout
      paddingHorizontal={16}
      className="bg-black pt-20"
      footer={
        <PrimaryButton 
          onPress={handleConfirm}
          className="bg-[#4CD964]"
          textClassName="text-white font-bold"
        >
          Confirm Captchas
        </PrimaryButton>
      }
    >
      {/* HEADER SECTION (Inside scroll for unified physics) */}
      <View className="mb-8">
        <HeaderTitle className="text-3xl text-green-400">Solve Captchas</HeaderTitle>

        <AuthTitle className="mt-1 mb-0 text-left text-gray-400">
          Solve these many number of captchas to waive of a penalty if occurred
        </AuthTitle>
      </View>

      {/* CONTENT SECTION */}
      <CaptchaWaiverContent 
        initialCount={latestDataRef.current.count}
        initialDifficulty={latestDataRef.current.difficulty}
        onChange={(data) => { latestDataRef.current = data; }} 
      />
    </ActionScreenLayout>
  );
}
