import { View, Text, TouchableOpacity } from "react-native";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

import { AuthTitle } from "@/components/ui/text";

export type TimeSlotCardProps = {
  startTime: string;
  endTime: string;
  onRemove?: () => void;
};

const UView = withUniwind(View);
const UPressable = withUniwind(TouchableOpacity);

export function TimeSlotCard({
  startTime,
  endTime,
  onRemove,
}: TimeSlotCardProps) {
  return (
    <UView className="w-full flex-row items-center bg-[#1A1A1A] rounded-3xl px-4 py-3 mb-3">
      {/* Left clock icon */}
      <UView className="w-8 h-8 rounded-full bg-[#4FA0FF] items-center justify-center mr-3">
        <MaterialCommunityIcons name="clock-outline" size={18} color="black" />
      </UView>

      {/* Time text (left aligned) */}
      <AuthTitle className="text-white flex-1 text-base font-medium mb-0 text-left">
        {startTime} – {endTime}
      </AuthTitle>

      {/* Remove button */}
      <UPressable onPress={onRemove} className="ml-2">
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path
            d="M18 6L6 18"
            stroke="#A1A1A1"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Path
            d="M6 6L18 18"
            stroke="#A1A1A1"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      </UPressable>
    </UView>
  );
}
