import React, { useRef, useState } from "react";
import { View, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { ActionScreenLayout, HeaderTitle, AuthTitle } from "@/components/ui";
import { CaptchaWaiverContent } from "@/components/ui/waivers/CaptchaWaiverContent";
import { useWaiverSync } from "@/hooks/commits/useWaiverSync";
import { withUniwind } from "uniwind";

const UPressable = withUniwind(Pressable);
const UText = withUniwind(Text);

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
  const [isPressed, setIsPressed] = useState(false);

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
      deadline_minutes: waiver?.deadline_minutes || 60,
    });
    
    console.log("[Waiver] Final Commit:", latestDataRef.current);
    router.back();
  };

  return (
    <ActionScreenLayout
      paddingHorizontal={16}
      className="bg-black pt-20"
      footer={
        <UPressable 
          onPress={handleConfirm}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          className="w-full h-14 items-center justify-center rounded-full"
          style={{ backgroundColor: isPressed ? "#5EE676" : "#4CD964" }}
        >
          <UText className="text-white font-bold text-lg">
            Confirm Captchas
          </UText>
        </UPressable>
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
