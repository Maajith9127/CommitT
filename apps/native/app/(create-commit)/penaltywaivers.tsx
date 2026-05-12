import { useRouter } from "expo-router";
import { View } from "react-native";
import { ActionScreenLayout, ScreenHeader } from "@/components/ui";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { AuthTitle, HeaderTitle } from "@/components/ui/text";
import { useWaiverSync } from "@/hooks/commits/useWaiverSync";
import { THEME } from "@/constants/theme";

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
    <ActionScreenLayout
      paddingHorizontal={16}
      style={{ backgroundColor: THEME.colors.background }}
    >
      {/* HEADER SECTION (Inside scroll for unified physics) */}
      <View className="mb-6">
        <HeaderTitle className="mt-16 text-3xl" style={{ color: THEME.colors.success }}>Penalty Waivers</HeaderTitle>

        <AuthTitle className="mt-1 mb-0 text-left" style={{ color: THEME.colors.textMuted }}>
          Choose how you want to EARN your penalty waiver
        </AuthTitle>
      </View>

      {/* 1 — SOLVE CAPTCHAS */}
      <ConditionCard
        icon="shield-check-outline"
        iconColor={THEME.colors.success}
        title="Solve CAPTCHAs"
        subtitle="Solve a set number of CAPTCHAs to waive your penalty"
        onPress={() => handleWaiverSelect("captcha")}
        selected={selectedWaiverType === "captcha"}
        selectionColor={THEME.colors.success}
        showArrow={true}
      />

      {/* 2 — TYPE A LONG PARAGRAPH */}
      <ConditionCard
        icon="pencil-outline"
        iconColor={THEME.colors.success}
        title="Write a Long Paragraph"
        subtitle="Type a 3000-word paragraph to earn a waiver"
        onPress={() => handleWaiverSelect("paragraph")}
        selected={selectedWaiverType === "paragraph"}
        selectionColor={THEME.colors.success}
        showArrow={true}
      />

      {/* 3 — REDO COMMITMENT WITH INTENSITY */}
      <ConditionCard
        icon="fire"
        iconColor={THEME.colors.success}
        title="Redo With More Intensity"
        subtitle="Repeat tomorrow with a harder version"
        onPress={() => handleWaiverSelect("intense")}
        selected={selectedWaiverType === "intense"}
        selectionColor={THEME.colors.success}
        showArrow={true}
      />

      {/* 4 — RUN 5 KM */}
      <ConditionCard
        icon="run-fast"
        iconColor={THEME.colors.success}
        title="Run 5 KM"
        subtitle="Choose a location and complete the run"
        onPress={() => handleWaiverSelect("run")}
        selected={selectedWaiverType === "run"}
        selectionColor={THEME.colors.success}
        showArrow={true}
      />
    </ActionScreenLayout>
  );
}
