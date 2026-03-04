import { useState } from "react";
import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";
import { ScreenHeader } from "@/components/ui";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { AuthTitle, HeaderTitle } from "@/components/ui/text";
import { PrimaryButton } from "@/components/ui/button";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

export default function PenaltyWaiversScreen() {
  const router = useRouter();
  const [selectedWaiver, setSelectedWaiver] = useState<string | null>(null);

  const handleWaiverSelect = (waiver: string) => {
    setSelectedWaiver(waiver);
    if (waiver === "captcha") {
      router.push("/(penaltywaiver)/setup");
    } else {
      if (waiver === "paragraph") router.push("/(create-commit)/waiver-paragraph");
      if (waiver === "intense") router.push("/(create-commit)/waiver-intense");
      if (waiver === "run") router.push("/(create-commit)/waiver-run");
    }
  };


  return (
    <UView className="flex-1 bg-black">
      {/* FIXED HEADER */}
      <ScreenHeader>
        <HeaderTitle className="mt-16 text-3xl text-green-400">Penalty Waivers</HeaderTitle>

        <AuthTitle className="mt-1 mb-0 text-left text-gray-400">
          Choose how you want to EARN your penalty waiver
        </AuthTitle>
      </ScreenHeader>

      {/* SCROLLABLE CONTENT */}
      <UScroll
        className="flex-1 mt-4 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1 — SOLVE CAPTCHAS */}
        <ConditionCard
          icon="shield-check-outline"
          iconColor="#4CD964"
          title="Solve CAPTCHAs"
          subtitle="Solve a set number of CAPTCHAs to waive your penalty"
          onPress={() => handleWaiverSelect("captcha")}
          selected={selectedWaiver === "captcha"}
          selectionColor="#4CD964"
          showArrow={true}
        />

        {/* 2 — TYPE A LONG PARAGRAPH */}
        <ConditionCard
          icon="pencil-outline"
          iconColor="#4CD964"
          title="Write a Long Paragraph"
          subtitle="Type a 3000-word paragraph to earn a waiver"
          onPress={() => handleWaiverSelect("paragraph")}
          selected={selectedWaiver === "paragraph"}
          selectionColor="#4CD964"
          showArrow={true}
        />

        {/* 3 — REDO COMMITMENT WITH INTENSITY */}
        <ConditionCard
          icon="fire"
          iconColor="#4CD964"
          title="Redo With More Intensity"
          subtitle="Repeat tomorrow with a harder version"
          onPress={() => handleWaiverSelect("intense")}
          selected={selectedWaiver === "intense"}
          selectionColor="#4CD964"
          showArrow={true}
        />

        {/* 4 — RUN 5 KM */}
        <ConditionCard
          icon="run-fast"
          iconColor="#4CD964"
          title="Run 5 KM"
          subtitle="Choose a location and complete the run"
          onPress={() => handleWaiverSelect("run")}
          selected={selectedWaiver === "run"}
          selectionColor="#4CD964"
          showArrow={true}
        />
      </UScroll>

    </UView>
  );
}
