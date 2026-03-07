import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";
import { ScreenHeader } from "@/components/ui";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { AuthTitle, HeaderTitle } from "@/components/ui/text";
import { useWaiverSync } from "@/hooks/commits/useWaiverSync";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

/**
 * PenaltyWaiversScreen
 * 
 * DESIGN: Connected Selector
 * This screen highlights the current waiver type saved in the global Zustand draft.
 * It uses the `useWaiverSync` hook to ensure that if a user already configured 
 * a waiver, it's immediately visible as "Selected".
 */
export default function PenaltyWaiversScreen() {
  const router = useRouter();
  const { waiver } = useWaiverSync();
  const selectedWaiverType = waiver?.type || null;

  const handleWaiverSelect = (waiverType: string) => {
    if (waiverType === "captcha") {
      router.push("/(penaltywaiver)/setup");
    } else {
      if (waiverType === "paragraph") router.push("/(create-commit)/waiver-paragraph");
      if (waiverType === "intense") router.push("/(create-commit)/waiver-intense");
      if (waiverType === "run") router.push("/(create-commit)/waiver-run");
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
          selected={selectedWaiverType === "captcha"}
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
          selected={selectedWaiverType === "paragraph"}
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
          selected={selectedWaiverType === "intense"}
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
          selected={selectedWaiverType === "run"}
          selectionColor="#4CD964"
          showArrow={true}
        />
      </UScroll>
    </UView>
  );
}
