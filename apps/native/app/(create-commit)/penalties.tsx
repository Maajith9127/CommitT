import { useRouter } from "expo-router";
import { View } from "react-native";
import { ActionScreenLayout } from "@/components/ui";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { AuthTitle, HeaderTitle } from "@/components/ui/text";
import { THEME } from "@/constants/theme";

import { useTaskDraftStore } from "@/stores/useTaskDraftStore";

export default function PenaltiesScreen() {
  const router = useRouter();
  const setDraft = useTaskDraftStore((s) => s.setDraft);
  const draft = useTaskDraftStore((s) => s.draft);

  return (
    <ActionScreenLayout
      paddingHorizontal={16}
      className="pt-20"
      style={{ backgroundColor: THEME.colors.background }}
    >
      {/* HEADER SECTION (Inside scroll for unified physics) */}
      <View className="mb-8">
        <HeaderTitle className="text-3xl" style={{ color: THEME.colors.danger }}>Penalties</HeaderTitle>

        <AuthTitle className="mt-1 mb-0 text-left" style={{ color: THEME.colors.textMuted }}>
          Choose what consequence activates when you fail
        </AuthTitle>
      </View>

      {/* 1 — MONEY PENALTY */}
      <ConditionCard
        icon="currency-inr"
        iconColor={THEME.colors.danger}
        title="Money Penalty"
        subtitle="Lose a fixed amount when you miss"
        selected={draft.penalty?.type === "money"}
        selectionColor={THEME.colors.danger}
        onPress={() => {
          router.push("/(penalties)/money");
        }}
        showArrow={true}
      />

      {/* 2 — EMBARRASSING PHOTO */}
      <ConditionCard
        icon="camera-enhance-outline"
        iconColor={THEME.colors.danger}
        title="Embarrassing Photo"
        subtitle="Send a cringe picture to someone"
        selected={draft.penalty?.type === "embarrassing_photo"}
        selectionColor={THEME.colors.danger}
        onPress={() => {
          router.push("/(penalties)/embarrassing-photo");
        }}
        showArrow={true}
      />

      {/* 3 — CRINGE MESSAGE */}
      <ConditionCard
        icon="message-alert-outline"
        iconColor={THEME.colors.danger}
        title="Cringe Message"
        subtitle="A shameful message gets sent to a contact"
        selected={draft.penalty?.type === "cringe_message"}
        selectionColor={THEME.colors.danger}
        onPress={() => {
          router.push("/(create-commit)/penalty-message");
        }}
        showArrow={true}
      />

      {/* 4 — BLOCK FAVOURITE APP */}
      <ConditionCard
        icon="cellphone-off"
        iconColor={THEME.colors.danger}
        title="Block Favourite App"
        subtitle="Your chosen app gets blocked temporarily"
        selected={draft.penalty?.type === "block_app"}
        selectionColor={THEME.colors.danger}
        onPress={() => {
          router.push("/(create-commit)/penalty-blockapp");
        }}
        showArrow={true}
      />
    </ActionScreenLayout>
  );
}
