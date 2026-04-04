import { View, Switch, TouchableOpacity } from "react-native";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { PrimaryButton } from "@/components/ui/button";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
  const conditions = useTaskDraftStore((s) => s.draft.conditions);
  const locationCondition = conditions.find((c: any) => c.metric_key === "location");
  
  const location = locationCondition ? {
    latitude: locationCondition.target.value.lat,
    longitude: locationCondition.target.value.lng,
    radius: locationCondition.target.value.radius,
    address: locationCondition.target.value.address ?? "Selected Location",
    isInverse: locationCondition.relation === "outside"
  } : null;

  const setLocation = useTaskDraftStore((s) => s.setLocation);

  const radius = location?.radius ?? 20;
  const isInverse = location?.isInverse ?? false;
  const address = location?.address ?? "Selected Location";

  const handleRadiusChange = (val: number) => {
    const rounded = Math.round(val);
    setLocation({
      latitude: location?.latitude ?? 24.543232,
      longitude: location?.longitude ?? 46.5108992,
      address: location?.address ?? "Selected Location",
      radius: rounded,
      isInverse: isInverse,
    });
  };

  const handleInverseToggle = (val: boolean) => {
    setLocation({
      latitude: location?.latitude ?? 24.543232,
      longitude: location?.longitude ?? 46.5108992,
      address: location?.address ?? "Selected Location",
      radius: radius,
      isInverse: val,
    });
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
        <PrimaryButton onPress={() => router.back()}>Save</PrimaryButton>
      </UView>
    </UView>
  );
}
