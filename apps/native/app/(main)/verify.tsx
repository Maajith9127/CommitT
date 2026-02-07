import { View, Text } from "react-native";
import { withUniwind } from "uniwind";
import { HeaderTitle } from "@/components/ui/text";

const UView = withUniwind(View);

export default function VerifyScreen() {
  return (
    <UView className="flex-1 bg-black px-4 pt-14">
      <HeaderTitle className="text-3xl mb-4">Verify Your Commits</HeaderTitle>
      <Text className="text-white text-lg">
        This is where your daily verification checklist will appear.
      </Text>
    </UView>
  );
}
