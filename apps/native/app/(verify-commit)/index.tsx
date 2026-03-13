import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { View, Pressable, ScrollView } from "react-native";
import { withUniwind } from "uniwind";

import { FooterText, HeaderTitle, PrimaryButton } from "@/components/ui";
import { DigitalCommitItem } from "@/components/ui/commits/DigitalCommitItem";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UPress = withUniwind(Pressable);

export default function VerifyCommitScreen() {
  const router = useRouter();
  const isVerifyWindow = true; // toggle to false to see disabled state

  return (
    <UView className="flex-1 bg-black px-4 pt-14 pb-28 relative">
      <UScroll showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Close icon row */}
        <UView className="mb-6">
          <UPress onPress={() => router.back()}>
            <MaterialCommunityIcons name="close" size={26} color="white" />
          </UPress>
        </UView>

        {/* Title + description */}
        <HeaderTitle className="text-3xl mb-2">Verify Your Commits</HeaderTitle>
        <FooterText className="mb-5 text-sm text-white">
          Verify helps you confirm your progress before moving forward.
        </FooterText>

        {/* Upcoming details */}
        <UView className=" flex-row items-center gap-2">
          <HeaderTitle className="text-xl">Upcoming</HeaderTitle>
          <MaterialCommunityIcons name="chevron-down-circle" size={24} color="#4FA0FF" />
        </UView>
        <FooterText className="">Gym , 6:00 AM – 7:00 AM , ₹100 , CAPTCHA</FooterText>

        {/* Commit details list */}
        <UView
          className={`mt-4 rounded-3xl bg-[#1A1A1A] px-5 py-1 border border-3 ${
            isVerifyWindow ? "border-[#4FA0FF]" : "border-gray-800"
          }`}
          style={!isVerifyWindow ? { opacity: 0.5 } : undefined}
          pointerEvents={isVerifyWindow ? "auto" : "none"}
        >
          <DigitalCommitItem
            title="Commit Name"
            items={[
              {
                id: "c1",
                name: "Gym",
                iconName: "dumbbell",
              },
            ]}
          />
          <UView className="h-[4px] bg-black -mx-5" />
          <DigitalCommitItem
            title="Conditions"
            items={[
              {
                id: "t1",
                name: "6:00 AM – 7:00 AM",
                iconName: "clock-outline",
              },
              {
                id: "l1",
                name: "Location: Downtown Gym",
                iconName: "map-marker",
              },
              {
                id: "p1",
                name: "Proof: Photo",
                iconName: "camera-outline",
              },
            ]}
          />
          <UView className="h-[4px] bg-black -mx-5" />
          <DigitalCommitItem
            title="Penalty & Waiver"
            items={[
              {
                id: "pen",
                name: "Penalty: ₹100 if missed",
                iconName: "currency-inr",
              },
              {
                id: "wav",
                name: "Waiver: CAPTCHA",
                iconName: "shield-check-outline",
              },
            ]}
            showBorder={false}
          />
        </UView>

        {/* History header */}
        <UView className="mt-6">
          <HeaderTitle className="text-xl">History</HeaderTitle>
        </UView>

        {/* History items */}
        <UView className="mt-4">
          <ConditionCard
            icon="check-circle-outline"
            iconColor="#4CD964"
            title="Gym — Aug 24"
            subtitle="6:00 AM – 7:00 AM • Verified • Photo submitted"
          />
          <ConditionCard
            icon="close-circle-outline"
            iconColor="#FF6B6B"
            title="Study — 2 days ago"
            subtitle="Missed session • Penalty applied"
          />
          <ConditionCard
            icon="tilde"
            iconColor="#4CD964"
            title="Run — Aug 20"
            subtitle="Waived via CAPTCHA • No penalty"
          />
          <ConditionCard
            icon="close-circle-outline"
            iconColor="#FF6B6B"
            title="Meditation — Aug 18"
            subtitle="Missed session • Penalty applied"
          />
        </UView>

        {/* Spacer so content doesn't hide behind sticky button */}
        <UView className="h-24" />
      </UScroll>

      {/* Sticky Verify CTA */}
      <UView className="absolute bottom-6 left-4 right-4">
        <PrimaryButton disabled={!isVerifyWindow}>Verify</PrimaryButton>
      </UView>
    </UView>
  );
}
