import { View, Switch } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";

import { HeaderTitle, FooterText } from "@/components/ui/text";
import { CustomSlider } from "@/components/ui/CustomSlider";

const UView = withUniwind(View);

export type StakeAmountCardProps = {
  amount: number;
  onAmountChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  className?: string;
  isRealMoney?: boolean;
  onToggleRealMoney?: (value: boolean) => void;
};

export function StakeAmountCard({
  amount,
  onAmountChange,
  minimumValue = 1,
  maximumValue = 5000,
  step = 1,
  className = "",
  isRealMoney = true,
  onToggleRealMoney,
}: StakeAmountCardProps) {
  return (
    <UView
      style={
        isRealMoney
          ? { borderWidth: 3, borderColor: "#4FA0FF", borderStyle: "solid" }
          : { borderWidth: 2, borderColor: "#666", borderStyle: "dashed" }
      }
      className={`mt-4 rounded-3xl bg-[#1A1A1A] px-4 py-4 ${className}`}
    >
      <UView className="flex-row items-center justify-between">
        <UView className="flex-row items-center flex-1">
          {/* ICON */}
          <MaterialCommunityIcons
            name={isRealMoney ? "cash-multiple" : "gamepad-variant-outline"}
            size={30}
            color={isRealMoney ? "#4FA0FF" : "#FFD700"}
            style={{ marginRight: 12 }}
          />

          {/* TITLE (Amount) */}
          <UView>
            <HeaderTitle className="text-lg" style={{ color: "#FFFFFF" }}>
              ₹{amount}
            </HeaderTitle>
            <FooterText className="text-xs text-gray-400">
              {isRealMoney ? "Real Money" : "Play Money"}
            </FooterText>
          </UView>
        </UView>

        {/* TOGGLE */}
        <Switch
          value={isRealMoney}
          onValueChange={onToggleRealMoney}
          trackColor={{ false: "#767577", true: "#4FA0FF" }}
          thumbColor={"#f4f3f4"}
        />
      </UView>

      {/* SLIDER */}
      <UView className="mt-4">
        <CustomSlider
          value={amount}
          onValueChange={onAmountChange}
          minimumValue={minimumValue}
          maximumValue={maximumValue}
          step={step}
          style={{ width: "100%", height: 40 }}
        />

        {/* RANGE LABELS */}
        <UView className="flex-row justify-between mt-1">
          <FooterText className="text-xs text-gray-500">₹{minimumValue}</FooterText>
          <FooterText className="text-xs text-gray-500">₹{maximumValue}</FooterText>
        </UView>
      </UView>
    </UView>
  );
}
