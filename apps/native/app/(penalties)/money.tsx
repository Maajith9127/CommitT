import { useState } from "react";
import { View, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";

import { HeaderTitle, FooterText, AuthTitle } from "@/components/ui/text";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { StakeAmountCard } from "@/components/ui/penalty/StakeAmountCard";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { PrimaryButton, ActionScreenLayout } from "@/components/ui";
import { useTaskDraftStore, TaskDraft } from "@/stores/useTaskDraftStore";

const UView = withUniwind(View);
const UScrollView = withUniwind(ScrollView);

export default function MoneyPenaltyScreen() {
  const router = useRouter();
  const draft = useTaskDraftStore((s) => s.draft);
  const setDraft = useTaskDraftStore((s) => s.setDraft);

  const initialAmount = draft.penalty?.type === "money" ? draft.penalty.config.amount : 500;
  const initialDestination = draft.penalty?.type === "money" ? draft.penalty.config.destination : "pool";
  const initialMethod = draft.penalty?.type === "money" ? draft.penalty.config.paymentMethod : "upi";

  const [amount, setAmount] = useState(initialAmount);
  const [selectedDestination, setSelectedDestination] = useState<string>(initialDestination);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(initialMethod);
  const [isRealMoney, setIsRealMoney] = useState(true);

  const handleConfirm = () => {
    setDraft({
      penalty: {
        type: "money",
        config: {
          amount,
          destination: selectedDestination,
          paymentMethod: selectedPaymentMethod,
          isReal: isRealMoney,
        }
      }
    });
    router.push("/(create-commit)/final");
  };

  return (
    <ActionScreenLayout
      paddingHorizontal={16}
      className="bg-black pt-20"
      footer={
        <PrimaryButton 
          onPress={handleConfirm}
          className="bg-[#FF3B30]"
          textClassName="text-white font-bold"
        >
          Stake Now
        </PrimaryButton>
      }
    >
      {/* TOP TITLE */}
      <UView className="mb-8">
        <HeaderTitle className="text-3xl text-red-500">Set Your Stake Amount</HeaderTitle>

        <AuthTitle className="mt-1 mb-0 text-left text-gray-400">
          Choose how much you'll lose if you miss this commitment.
        </AuthTitle>
      </UView>

      {/* AMOUNT STAKED ROW */}
      <UView className="flex-row items-center mt-8 gap-2">
        <HeaderTitle className="text-2xl">Amount Staked</HeaderTitle>

        <MaterialCommunityIcons name="chevron-down-circle" size={24} color="#4FA0FF" />
      </UView>

      {/* STAKE AMOUNT CARD */}
      <StakeAmountCard
        amount={amount}
        onAmountChange={(val: number) => setAmount(val)}
        minimumValue={1}
        maximumValue={5000}
        step={1}
        isRealMoney={isRealMoney}
        onToggleRealMoney={(val: boolean) => setIsRealMoney(val)}
      />

      {/* SEND PENALTY TO ROW */}
      <UView className="flex-row items-center mt-8 gap-2">
        <HeaderTitle className="text-2xl">Send Penalty to</HeaderTitle>

        <MaterialCommunityIcons name="chevron-down-circle" size={24} color="#4FA0FF" />
      </UView>

      {/* PENALTY DESTINATION CARDS */}
      <UView className="mt-4">
        <ConditionCard
          icon="bank"
          iconColor="#FFD700"
          title="CommitT Pool"
          subtitle="Redistributed to successful users"
          selected={selectedDestination === "pool"}
          onPress={() => setSelectedDestination("pool")}
        />

        <ConditionCard
          icon="charity"
          iconColor="#FF69B4"
          title="Charity"
          subtitle="Donate to verified NGOs"
          selected={selectedDestination === "charity"}
          onPress={() => setSelectedDestination("charity")}
        />

        <ConditionCard
          icon="account-circle"
          iconColor="#9B59B6"
          title="Accountability Partner"
          subtitle="Send to someone you trust"
          selected={selectedDestination === "partner"}
          onPress={() => setSelectedDestination("partner")}
        />
      </UView>

      {/* PAYMENT METHOD ROW */}
      <UView className="flex-row items-center mt-8 gap-2">
        <HeaderTitle className="text-2xl">Payment Method</HeaderTitle>

        <MaterialCommunityIcons name="chevron-down-circle" size={24} color="#4FA0FF" />
      </UView>

      {/* PAYMENT METHOD CARDS */}
      <UView className="mt-4 pb-10">
        <ConditionCard
          icon="calculator-variant"
          iconColor="#4FA0FF"
          title="UPI"
          subtitle="Pay via any UPI app"
          selected={selectedPaymentMethod === "upi"}
          onPress={() => setSelectedPaymentMethod("upi")}
        />

        <ConditionCard
          icon="credit-card"
          iconColor="#4FA0FF"
          title="Debit/Credit Card"
          subtitle="•••• 1881"
          selected={selectedPaymentMethod === "card"}
          onPress={() => setSelectedPaymentMethod("card")}
        />
      </UView>
    </ActionScreenLayout>
  );
}
