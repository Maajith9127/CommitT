import { View, TouchableOpacity } from "react-native";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { PrimaryButton } from "@/components/ui/button";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { THEME } from "@/constants/theme";

import { useTaskDraftStore } from "@/stores/useTaskDraftStore";
import { CustomSlider } from "@/components/ui/CustomSlider";
import { PremiumToggle } from "@/components/ui/PremiumToggle";

const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);

export function LocationConditionPanel({
  onSearchPress,
  onCenterPress,
  localRadius,
  setLocalRadius,
}: {
  onSearchPress?: () => void;
  onCenterPress?: () => void;
  localRadius: number;
  setLocalRadius: (val: number) => void;
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

  /**
   * HIGH-FREQUENCY UPDATE
   * Triggered on every pixel move of the slider. Updates ONLY the local UI state
   * to ensure the map circle grows/shrinks at 60fps.
   */
  const handleRadiusChange = (val: number) => {
    const rounded = Math.round(val);
    setLocalRadius(rounded);
  };

  /**
   * BUFFERED COMMIT
   * Triggered ONLY when the user releases the slider. Updates the expensive 
   * global Zustand store once the final value is settled.
   */
  const handleSlidingComplete = (val: number) => {
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
    <UView 
      className="absolute bottom-4 left-4 right-4 rounded-3xl px-4 py-4"
      style={{ backgroundColor: THEME.colors.surfaceElevated }}
    >
      {/* LOCATION */}
      <UButton onPress={onCenterPress} activeOpacity={0.7}>
        <HeaderTitle className="text-base" style={{ color: THEME.colors.textMain }}>{address}</HeaderTitle>
      </UButton>

      {/* RADIUS */}
      <UView className="mt-4">
        <UView className="flex-row justify-between items-center">
          <HeaderTitle className="text-sm">Radius</HeaderTitle>

          <FooterText style={{ color: THEME.colors.primary }}>{localRadius} m</FooterText>
        </UView>

        <CustomSlider
          minimumValue={20}
          maximumValue={2000}
          step={10}
          value={localRadius}
          onValueChange={handleRadiusChange}
          onSlidingComplete={handleSlidingComplete}
          className="mt-2 h-10"
        />
      </UView>

      {/* INVERSE RADIUS */}
      <UView className="mt-4 flex-row items-center justify-between">
        <HeaderTitle className="text-sm">Inverse radius</HeaderTitle>

        <PremiumToggle
          value={isInverse}
          onValueChange={handleInverseToggle}
        />
      </UView>

      {/* SAVE BUTTON */}
      <UView className="mt-4">
        <PrimaryButton onPress={() => router.back()}>Save</PrimaryButton>
      </UView>
    </UView>
  );
}
