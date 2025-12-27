import { View, TouchableOpacity } from "react-native";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);

export function LocationMapNavBar({
  onBack,
  onLocate,
  onSearch,
}: {
  onBack?: () => void;
  onLocate?: () => void;
  onSearch?: () => void;
}) {
  return (
    <UView className="absolute top-12 left-4 right-4 z-50 flex-row items-center justify-between">
      {/* BACK */}
      <UButton
        onPress={onBack}
        className="h-11 w-11 items-center justify-center rounded-full bg-[#1A1A1A]"
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color="#4FA0FF" />
      </UButton>

      {/* RIGHT ACTIONS */}
      <UView className="flex-row space-x-3">
        {/* CURRENT LOCATION */}
        <UButton
          onPress={onLocate}
          className="h-11 w-11 items-center justify-center rounded-full bg-[#1A1A1A]"
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#4FA0FF" />
        </UButton>

        {/* SEARCH */}
        <UButton
          onPress={onSearch}
          className="h-11 w-11 items-center justify-center rounded-full bg-[#1A1A1A]"
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="magnify" size={22} color="#4FA0FF" />
        </UButton>
      </UView>
    </UView>
  );
}
