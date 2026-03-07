import { useRouter } from "expo-router";
import { View } from "react-native";
import { ActionScreenLayout } from "@/components/ui";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { AuthTitle, HeaderTitle } from "@/components/ui/text";

import { useTaskDraftStore } from "@/stores/useTaskDraftStore";

export default function PenaltiesScreen() {
  const router = useRouter();
  const setDraft = useTaskDraftStore((s) => s.setDraft);
  const draft = useTaskDraftStore((s) => s.draft);

  return (
    <ActionScreenLayout
      paddingHorizontal={16}
      className="bg-black pt-20"
    >
      {/* HEADER SECTION (Inside scroll for unified physics) */}
      <View className="mb-8">
        <HeaderTitle className="text-3xl text-red-400">Penalties</HeaderTitle>

        <AuthTitle className="mt-1 mb-0 text-left text-gray-400">
          Choose what consequence activates when you fail
        </AuthTitle>
      </View>

      {/* 1 — MONEY PENALTY */}
      <ConditionCard
        icon="currency-inr"
        iconColor="#FF3B30"
        title="Money Penalty"
        subtitle="Lose a fixed amount when you miss"
        selected={draft.penalty?.type === "money"}
        selectionColor="#FF3B30"
        onPress={() => {
          setDraft({
            penalty: {
              type: "money",
              config: draft.penalty?.type === "money" ? draft.penalty.config : { amount: 500 }
            }
          });
          router.push("/(penalties)/money");
        }}
      />

      {/* 2 — EMBARRASSING PHOTO */}
      <ConditionCard
        icon="camera-enhance-outline"
        iconColor="#FF3B30"
        title="Embarrassing Photo"
        subtitle="Send a cringe picture to someone"
        selected={draft.penalty?.type === "embarrassing_photo"}
        selectionColor="#FF3B30"
        onPress={() => {
          setDraft({
            penalty: {
              type: "embarrassing_photo",
              config: draft.penalty?.type === "embarrassing_photo" ? draft.penalty.config : {
                channel: "whatsapp",
                description: "",
                emailTo: "",
                emailSubject: "I failed my commitment!",
                emailBody: "",
                photoUrl: null
              }
            }
          });
          router.push("/(penalties)/embarrassing-photo");
        }}
      />

      {/* 3 — CRINGE MESSAGE */}
      <ConditionCard
        icon="message-alert-outline"
        iconColor="#FF3B30"
        title="Cringe Message"
        subtitle="A shameful message gets sent to a contact"
        selected={draft.penalty?.type === "cringe_message"}
        selectionColor="#FF3B30"
        onPress={() => {
          setDraft({
            penalty: {
              type: "cringe_message",
              config: draft.penalty?.type === "cringe_message" ? draft.penalty.config : { message: "", recipient: "" }
            }
          });
          router.push("/(create-commit)/penalty-message");
        }}
      />

      {/* 4 — BLOCK FAVOURITE APP */}
      <ConditionCard
        icon="cellphone-off"
        iconColor="#FF3B30"
        title="Block Favourite App"
        subtitle="Your chosen app gets blocked temporarily"
        selected={draft.penalty?.type === "block_app"}
        selectionColor="#FF3B30"
        onPress={() => {
          setDraft({
            penalty: {
              type: "block_app",
              config: draft.penalty?.type === "block_app" ? draft.penalty.config : { appId: "" }
            }
          });
          router.push("/(create-commit)/penalty-blockapp");
        }}
      />
    </ActionScreenLayout>
  );
}
