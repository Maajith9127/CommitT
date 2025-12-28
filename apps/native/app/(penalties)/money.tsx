import { useState } from "react";
import { View, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";

import { HeaderTitle, FooterText } from "@/components/ui/text";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { StakeAmountCard } from "@/components/ui/penalty/StakeAmountCard";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { PrimaryButton } from "@/components/ui/button";

const UView = withUniwind(View);
const UScrollView = withUniwind(ScrollView);

export default function MoneyPenaltyScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState(500);
  const [selectedDestination, setSelectedDestination] = useState<string>("pool");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("upi");
  const [isRealMoney, setIsRealMoney] = useState(true);

  return (
    <UView className="flex-1 bg-black">
      <UScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        <ScreenContainer>
          {/* TOP TITLE */}
          <UView className="mt-12">
            <HeaderTitle className="text-3xl">Set Your Stake Amount</HeaderTitle>

            <FooterText className="mt-2 text-sm">
              Choose how much you'll lose if you miss this commitment.
            </FooterText>
          </UView>

          {/* AMOUNT STAKED ROW */}
          <UView className="flex-row items-center mt-8 gap-2">
            <HeaderTitle className="text-2xl">Amount Staked</HeaderTitle>

            <MaterialCommunityIcons name="chevron-down-circle" size={24} color="#4FA0FF" />
          </UView>

          {/* STAKE AMOUNT CARD */}
          <StakeAmountCard
            amount={amount}
            onAmountChange={(val) => setAmount(val)}
            minimumValue={1}
            maximumValue={5000}
            step={1}
            isRealMoney={isRealMoney}
            onToggleRealMoney={(val) => setIsRealMoney(val)}
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
          <UView className="mt-4">
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
        </ScreenContainer>
      </UScrollView>

      {/* STICKY BOTTOM BUTTON */}
      <UView className="absolute bottom-0 left-0 right-0 bg-black px-4 py-4 pb-8">
        <PrimaryButton onPress={() => {}}>Stake Now</PrimaryButton>
      </UView>
    </UView>
  );
}
