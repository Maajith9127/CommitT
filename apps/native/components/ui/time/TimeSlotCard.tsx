import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AuthTitle } from "@/components/ui/text";

export type TimeSlotCardProps = {
  startTime: string;
  endTime: string;
  onRemove?: () => void;
  locationName?: string;
  digitalMode?: string;
};

const UView = withUniwind(View);
const UText = withUniwind(Text);
const UPressable = withUniwind(Pressable);

/**
 * TimeSlotCard Component
 * -----------------------------------------------------------------------------
 * Clean, expandable representation of a scheduled time window.
 * The delete button and granular settings are hidden within the expanded state
 * to maintain a high-signal, zero-clutter interface.
 */
export function TimeSlotCard({ 
  startTime, 
  endTime, 
  onRemove,
  locationName,
  digitalMode 
}: TimeSlotCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <UView className="mb-3 w-full rounded-3xl bg-[#1A1A1A] overflow-hidden">
      {/* ── HEADER (THE ORIGINAL CARD) ── */}
      <UPressable 
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
        className="w-full flex-row items-center px-4 py-3"
      >
        {/* ── HARDWARE ICON ── */}
        <UView className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-[#4FA0FF]">
          <MaterialCommunityIcons name="clock-outline" size={18} color="black" />
        </UView>

        {/* ── DURATION MANIFEST ── */}
        <AuthTitle className="mb-0 flex-1 text-left font-medium text-base text-white">
          {startTime} – {endTime}
        </AuthTitle>

        {/* ── EXPANSION TOGGLE (REPLACES ORIGINAL CROSS) ── */}
        <UView className="ml-2">
           <MaterialCommunityIcons 
             name={isExpanded ? "chevron-up" : "chevron-down"} 
             size={20} 
             color="#A1A1A1" 
           />
        </UView>
      </UPressable>

      {/* ── EXPANDED PANEL (THE DRAWER) ── */}
      {isExpanded && (
        <UView className="border-t border-[#262626] bg-[#141414] px-4 py-4">
          <UView className="flex-row items-center justify-between">
            {/* Condition Placeholders */}
            <UView className="flex-row items-center gap-4">
              <UView className="flex-row items-center gap-1.5">
                <MaterialCommunityIcons name="map-marker" size={14} color="#FF4F85" />
                <UText className="text-gray-400 text-sm font-medium">
                  {locationName ?? "Add Location"}
                </UText>
              </UView>
              
              <UView className="flex-row items-center gap-1.5">
                <MaterialCommunityIcons name="block-helper" size={14} color="#FFB84F" />
                <UText className="text-gray-400 text-sm font-medium">
                  {digitalMode ?? "Strict Mode"}
                </UText>
              </UView>
            </UView>

            {/* Removal Action (Delete slot) */}
            <UPressable 
              onPress={onRemove}
              hitSlop={12}
            >
              <UText className="text-red-500 font-semibold text-sm">Delete slot</UText>
            </UPressable>
          </UView>

          {/* Placeholder for future surgical context controls */}
          <UView className="mt-4 rounded-xl border border-dashed border-[#333] p-4 items-center justify-center">
             <UText className="text-gray-600 text-xs text-center italic">
                Surgical Context Controls coming soon...
             </UText>
          </UView>
        </UView>
      )}
    </UView>
  );
}
