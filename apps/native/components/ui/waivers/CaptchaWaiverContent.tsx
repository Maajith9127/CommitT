import { useState, useEffect } from "react";
import { View, TouchableOpacity, LayoutChangeEvent, Dimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { CustomSlider } from "@/components/ui/CustomSlider";
import { CaptchaGenerator } from "@/components/ui/captcha/CaptchaGenerator";

const UView = withUniwind(View);

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type CaptchaWaiverContentProps = {
  initialCount?: number;
  initialDifficulty?: string;
  onChange: (data: { count: number; difficulty: string }) => void;
};

export function CaptchaWaiverContent({ 
  initialCount = 5, 
  initialDifficulty = "medium", 
  onChange 
}: CaptchaWaiverContentProps) {
  const [captchaCount, setCaptchaCount] = useState(initialCount);
  const [captchaDifficulty, setCaptchaDifficulty] = useState(initialDifficulty);
  
  // Pre-calculate an estimate to avoid the 0 -> width jump 
  // (Screen width - 32 for standard horizontal padding)
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH - 32);

  useEffect(() => {
    // Debounce the state push to the parent to prevent rapid re-renders 
    // and "Maximum update depth exceeded" errors
    const handler = setTimeout(() => {
      onChange({ count: captchaCount, difficulty: captchaDifficulty });
    }, 100);

    return () => clearTimeout(handler);
  }, [captchaCount, captchaDifficulty, onChange]);

  const handleDifficultySelect = (level: string) => {
    setCaptchaDifficulty(level);
  };

  // Helper to determine difficulty label color and icon
  const getDifficulty = (count: number) => {
    if (count <= 50) return { label: "Easy Peasy", color: "text-green-400", icon: "robot-excited-outline", iconColor: "#4CD964" as const };
    if (count <= 150) return { label: "Medium Friction", color: "text-yellow-400", icon: "robot-confused-outline", iconColor: "#facc15" as const };
    if (count <= 300) return { label: "High Friction", color: "text-orange-400", icon: "robot-angry-outline", iconColor: "#fb923c" as const };
    return { label: "Extreme Pain", color: "text-red-500", icon: "robot-dead-outline", iconColor: "#ef4444" as const };
  };

  return (
    <UView>

      <UView className="items-center justify-center mb-4 flex-row space-x-4">
        <MaterialCommunityIcons 
          name={getDifficulty(captchaCount).icon as any} 
          size={100} 
          color={getDifficulty(captchaCount).iconColor} 
        />
        <HeaderTitle className="text-6xl text-white ml-6">{captchaCount}</HeaderTitle>
      </UView>

      {/* DIFFICULTY LABEL */}
      <UView className="items-center mb-10">
        <HeaderTitle className={`text-xl ${getDifficulty(captchaCount).color}`}>
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

      <UView className="flex-row justify-between mt-2 mb-8">
        <FooterText className="text-gray-500">1</FooterText>
        <FooterText className="text-gray-500">400</FooterText>
      </UView>

      {/* NOISE LEVEL SELECTOR */}
      <FooterText className="text-gray-400 mb-4 text-base">Select Captcha Toughness (Noise Level)</FooterText>
      <UView className="flex-row gap-4 mb-10">
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
                captchaDifficulty === level ? "text-white" : "text-gray-400"
              } capitalize text-base font-bold`}
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
        {/* Reserve space with a fixed height container to avoid layout jitter on mount */}
        <UView 
          className="w-full h-[100px] bg-[#111] rounded-xl overflow-hidden items-center justify-center border border-[#333]"
        >
          {containerWidth > 0 && (
            <CaptchaGenerator difficulty={captchaDifficulty} width={containerWidth} height={100} />
          )}
        </UView>

        <FooterText className="mt-3 text-gray-400 text-center">
          {captchaDifficulty === "low" && "Simple, clear text. Easy to read."}
          {captchaDifficulty === "medium" && "Slightly distorted with noise."}
          {captchaDifficulty === "high" && "Heavily distorted, grainy, and hard to read."}
        </FooterText>
      </UView>

    </UView>
  );
}
