import { useState } from "react";
import { View, TouchableOpacity, LayoutChangeEvent } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { PrimaryButton } from "@/components/ui/button";
import { CustomSlider } from "@/components/ui/CustomSlider";
import { CaptchaGenerator } from "@/components/ui/captcha/CaptchaGenerator";

const UView = withUniwind(View);

type CaptchaWaiverContentProps = {
  onConfirm: (data: { count: number; difficulty: string }) => void;
};

export function CaptchaWaiverContent({ onConfirm }: CaptchaWaiverContentProps) {
  const [captchaCount, setCaptchaCount] = useState(5);
  const [captchaDifficulty, setCaptchaDifficulty] = useState("medium");
  const [containerWidth, setContainerWidth] = useState(0);

  const handleDifficultySelect = (level: string) => {
    setCaptchaDifficulty(level);
  };

  // Helper to determine difficulty label color
  const getDifficulty = (count: number) => {
    if (count <= 50) return { label: "Easy Peasy", color: "text-green-400" };
    if (count <= 150) return { label: "Medium Friction", color: "text-yellow-400" };
    if (count <= 300) return { label: "High Friction", color: "text-orange-400" };
    return { label: "Extreme Pain", color: "text-red-500" };
  };

  return (
    <UView className="flex-1">
      <FooterText className="text-gray-400 mb-8">
        Solve these many number of captchas to waive of a penalty if occured
      </FooterText>

      <UView className="items-center justify-center mb-4 flex-row space-x-4">
        <MaterialCommunityIcons name="robot-excited-outline" size={60} color="#4CD964" />
        <HeaderTitle className="text-5xl text-white ml-4">{captchaCount}</HeaderTitle>
      </UView>

      {/* DIFFICULTY LABEL */}
      <UView className="items-center mb-8">
        <HeaderTitle className={`text-lg ${getDifficulty(captchaCount).color}`}>
          {getDifficulty(captchaCount).label}
        </HeaderTitle>
      </UView>

      <CustomSlider
        value={captchaCount}
        onValueChange={(val: number) => setCaptchaCount(val)}
        minimumValue={1}
        maximumValue={400}
        step={1}
        minimumTrackTintColor="#4CD964"
        thumbTintColor="#FFFFFF"
      />

      <UView className="flex-row justify-between mt-2 mb-6">
        <FooterText className="text-gray-500">1</FooterText>
        <FooterText className="text-gray-500">400</FooterText>
      </UView>

      {/* NOISE LEVEL SELECTOR */}
      <FooterText className="text-gray-400 mb-3">Select Captcha Toughness (Noise Level)</FooterText>
      <UView className="flex-row gap-4 mb-8">
        {["low", "medium", "high"].map((level) => (
          <TouchableOpacity
            key={level}
            onPress={() => handleDifficultySelect(level)}
            className={`flex-1 py-4 rounded-[32px] border ${
              captchaDifficulty === level
                ? "bg-[#4CD964] border-[#4CD964]"
                : "bg-[#1A1A1A] border-gray-700"
            } items-center justify-center`}
          >
            <HeaderTitle
              className={`${
                captchaDifficulty === level ? "text-black" : "text-gray-400"
              } capitalize text-base`}
            >
              {level}
            </HeaderTitle>
          </TouchableOpacity>
        ))}
      </UView>

      {/* VISUAL PREVIEW OF NOISE */}
      <UView
        className="items-center mb-8 w-full"
        onLayout={(event: LayoutChangeEvent) => setContainerWidth(event.nativeEvent.layout.width)}
      >
        {containerWidth > 0 && (
          <CaptchaGenerator difficulty={captchaDifficulty} width={containerWidth} height={80} />
        )}

        <FooterText className="mt-3 text-gray-400 text-center">
          {captchaDifficulty === "low" && "Simple, clear text. Easy to read."}
          {captchaDifficulty === "medium" && "Slightly distorted with noise."}
          {captchaDifficulty === "high" && "Heavily distorted, grainy, and hard to read."}
        </FooterText>
      </UView>

      <View className="flex-1 justify-end mb-8">
        <PrimaryButton
          onPress={() => onConfirm({ count: captchaCount, difficulty: captchaDifficulty })}
          className="bg-[#4CD964]"
          textClassName=" "
        >
          Confirm Captchas
        </PrimaryButton>
      </View>
    </UView>
  );
}
