import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  Easing,
  runOnJS 
} from "react-native-reanimated";

import { AuthTitle, BodyText, FooterText } from "@/components/ui/text";

export type TimeSlotCardProps = {
  startTime: string;
  endTime: string;
  onRemove?: () => void;
  onPress?: () => void;
};

const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);

/**
 * TimeSlotCard Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Vertical-stack UI with a smooth slide-down animated drawer.
 *
 * ANIMATION:
 *   Uses Reanimated shared values to animate the drawer height from 0 to
 *   its measured content height. The animation runs on the UI thread for
 *   buttery 60fps performance — no JS bridge jank.
 */
export function TimeSlotCard({ 
  startTime, 
  endTime, 
  onRemove, 
  onPress,
}: TimeSlotCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const animatedHeight = useSharedValue(0);
  const animatedOpacity = useSharedValue(0);

  /**
   * Measures the drawer content height on first render,
   * then uses that value for all subsequent animations.
   */
  const onContentLayout = useCallback((e: any) => {
    const height = e.nativeEvent.layout.height;
    if (height > 0 && contentHeight === 0) {
      setContentHeight(height);
    }
  }, [contentHeight]);

  function toggleExpand(e: any) {
    e.stopPropagation();
    const expanding = !isExpanded;
    setIsExpanded(expanding);

    const targetHeight = expanding ? (contentHeight || 200) : 0;
    const targetOpacity = expanding ? 1 : 0;

    animatedHeight.value = withTiming(targetHeight, {
      duration: 280,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    animatedOpacity.value = withTiming(targetOpacity, {
      duration: 200,
    });
  }

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    opacity: animatedOpacity.value,
    overflow: 'hidden' as const,
  }));

  return (
    <UView className="mb-3 w-full rounded-2xl bg-[#1A1A1A] overflow-hidden">
      {/* ── TIME HEADER ── */}
      <UPressable 
        onPress={onPress}
        activeOpacity={0.7}
        className="w-full flex-row items-center px-4 py-3.5"
      >
        <UView className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-[#4FA0FF]">
          <MaterialCommunityIcons name="clock-outline" size={18} color="black" />
        </UView>

        <AuthTitle className="mb-0 flex-1 text-left font-medium text-base text-white">
          {startTime} – {endTime}
        </AuthTitle>

        <UPressable 
          onPress={toggleExpand}
          className="ml-2 h-8 w-8 items-center justify-center"
          hitSlop={12}
        >
           <MaterialCommunityIcons 
             name={isExpanded ? "chevron-up" : "chevron-down"} 
             size={22} 
             color="#A1A1A1" 
           />
        </UPressable>
      </UPressable>

      {/* ── ANIMATED DRAWER ── */}
      <Animated.View style={animatedContainerStyle}>
        <View 
          onLayout={onContentLayout}
          style={{ position: contentHeight === 0 ? 'absolute' : 'relative', opacity: contentHeight === 0 ? 0 : 1 }}
        >
          <UView className="border-t-2 border-black">
            {/* ── Location Row ── */}
            <UPressable className="flex-row items-center px-4 py-3 border-b-2 border-black">
              <MaterialCommunityIcons 
                name="map-marker-outline" 
                size={28} 
                color="#9CA3AF" 
                style={{ marginRight: 16 }} 
              />
              <UView className="flex-1">
                <FooterText className="mt-0 text-gray-400">Location</FooterText>
                <BodyText className="text-gray-500 text-sm mt-0.5">Tap to set</BodyText>
              </UView>
            </UPressable>

            {/* ── App Block Row ── */}
            <UPressable className="flex-row items-center px-4 py-3 border-b-2 border-black">
              <MaterialCommunityIcons 
                name="cellphone-lock" 
                size={28} 
                color="#9CA3AF" 
                style={{ marginRight: 16 }} 
              />
              <UView className="flex-1">
                <FooterText className="mt-0 text-gray-400">App block</FooterText>
                <BodyText className="text-gray-500 text-sm mt-0.5">Tap to set</BodyText>
              </UView>
            </UPressable>

            {/* ── Delete Slot Action ── */}
            <UPressable 
              onPress={onRemove}
              className="flex-row items-center justify-center py-3 gap-2"
            >
              <MaterialCommunityIcons name="delete-outline" size={18} color="#FF3B30" />
              <BodyText className="text-[#FF3B30] text-sm">Delete slot</BodyText>
            </UPressable>
          </UView>
        </View>
      </Animated.View>
    </UView>
  );
}
