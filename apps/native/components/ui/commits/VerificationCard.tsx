import { View, Text } from "react-native";
import { withUniwind } from "uniwind";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { HeaderTitle } from "@/components/ui/text";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const UView = withUniwind(View);
const UText = withUniwind(Text);

export type VerificationCardProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function VerificationCard({
  title = "Verification",
  description = "Start your verification.",
  className = "",
}: VerificationCardProps) {
  return (
    <UView className={`rounded-3xl  mt-4 ${className}`}>
      {/* INNER CARD */}
      <UView className="bg-[#1A1A1A] rounded-4xl px-4  pt-2 pb-4">
        {/* TITLE ROW */}
        <UView className="flex-row items-center justify-between mb-2">
          <HeaderTitle className="text-white pt-3 text-xl">{title}</HeaderTitle>

          <MaterialCommunityIcons
            name="shield-alert-outline"
            size={22}
            color="#8A8A8A"
          />
        </UView>
        <UText className="text-gray-400 mb-4 text-base">{description}</UText>

        {/* DESCRIPTION */}

        {/* PRIMARY BUTTON */}
        <PrimaryButton className="mb-4">Start Verification</PrimaryButton>

        {/* TIMER + MANUAL */}
        <UView className="flex-row items-center justify-between">
          <SecondaryButton className="flex-1 rounded-4xl mr-2">
            Timer
          </SecondaryButton>
          <SecondaryButton className="flex-1 rounded-4xl ml-2">
            Manual Check
          </SecondaryButton>
        </UView>
      </UView>
    </UView>
  );
}
