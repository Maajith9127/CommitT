import { View, Switch } from "react-native";
import { withUniwind } from "uniwind";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { PrimaryButton } from "@/components/ui/button";

const UView = withUniwind(View);

export function LocationConditionPanel() {
  return (
    <UView className="absolute bottom-4 left-4 right-4 rounded-3xl bg-[#1A1A1A] px-4 py-4">
      {/* LOCATION */}
      <HeaderTitle className="text-base text-blue-400">
        Kadayannallur, Parasuramapuram South Street
      </HeaderTitle>

      {/* RADIUS */}
      <UView className="mt-4">
        <UView className="flex-row justify-between items-center">
          <HeaderTitle className="text-sm">Radius</HeaderTitle>

          <FooterText className="text-blue-400">250 m</FooterText>
        </UView>

        {/* Placeholder for slider */}
        <UView className="mt-2 h-1 rounded-full bg-gray-600" />
      </UView>

      {/* INVERSE RADIUS */}
      <UView className="mt-4 flex-row items-center justify-between">
        <HeaderTitle className="text-sm">Inverse radius</HeaderTitle>

        <Switch value />
      </UView>

      {/* SAVE BUTTON */}
      <UView className="mt-4">
        <PrimaryButton onPress={() => {}}>Save</PrimaryButton>
      </UView>
    </UView>
  );
}
