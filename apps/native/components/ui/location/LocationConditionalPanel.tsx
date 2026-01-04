import { View, Switch, TouchableOpacity } from "react-native";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { PrimaryButton } from "@/components/ui/button";

import { useTaskDraftStore } from "@/stores/useTaskDraftStore";
import { CustomSlider } from "@/components/ui/CustomSlider";

const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);

export function LocationConditionPanel({
  onSearchPress,
  onCenterPress,
}: {
  onSearchPress?: () => void;
  onCenterPress?: () => void;
}) {
  const router = useRouter();
  const location = useTaskDraftStore((s) => s.draft.location);
  const setLocation = useTaskDraftStore((s) => s.setLocation);

  const radius = location?.radius ?? 20;
  const isInverse = location?.isInverse ?? false;
  const address = location?.address ?? "Kadayannallur, Parasuramapuram South Street";

  const handleRadiusChange = (val: number) => {
    const rounded = Math.round(val);
    if (!location) {
      // Initialize if null
      setLocation({
        latitude: 24.543232,
        longitude: 46.5108992,
        address: "Kadayannallur, Parasuramapuram South Street",
        radius: rounded,
        isInverse: false,
      });
      return;
    }
    setLocation({ ...location, radius: rounded });
  };

  const handleInverseToggle = (val: boolean) => {
    if (!location) {
      // Initialize if null
      setLocation({
        latitude: 24.543232,
        longitude: 46.5108992,
        address: "Kadayannallur, Parasuramapuram South Street",
        radius: 20,
        isInverse: val,
      });
      return;
    }
    setLocation({ ...location, isInverse: val });
  };

  return (
    <UView className="absolute bottom-4 left-4 right-4 rounded-3xl bg-[#1A1A1A] px-4 py-4">
      {/* LOCATION */}
      <UButton onPress={onCenterPress} activeOpacity={0.7}>
        <HeaderTitle className="text-base text-[#4FA0FF]">{address}</HeaderTitle>
      </UButton>

      {/* RADIUS */}
      <UView className="mt-4">
        <UView className="flex-row justify-between items-center">
          <HeaderTitle className="text-sm">Radius</HeaderTitle>

          <FooterText className="text-[#4FA0FF]">{radius} m</FooterText>
        </UView>

        <CustomSlider
          minimumValue={20}
          maximumValue={2000}
          step={10}
          value={radius}
          onValueChange={handleRadiusChange}
          className="mt-2 h-10"
        />
      </UView>

      {/* INVERSE RADIUS */}
      <UView className="mt-4 flex-row items-center justify-between">
        <HeaderTitle className="text-sm">Inverse radius</HeaderTitle>

        <Switch
          value={isInverse}
          onValueChange={handleInverseToggle}
          trackColor={{ false: "#3A3A3C", true: "#4FA0FF" }}
          thumbColor="#FFFFFF"
        />
      </UView>

      {/* SAVE BUTTON */}
      <UView className="mt-4">
        <PrimaryButton onPress={() => router.push("/(create-commit)/final")}>Save</PrimaryButton>
      </UView>
    </UView>
  );
}
