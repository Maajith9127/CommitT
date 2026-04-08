import { useCallback, useRef, useState, useMemo } from "react";
import { Pressable, View, ScrollView, Image } from "react-native";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  Easing,
} from "react-native-reanimated";

import { AuthTitle, BodyText, FooterText } from "@/components/ui/text";
import { useAppStore } from "@/stores/useAppStore";

export type TimeSlotCardProps = {
  startTime: string;
  endTime: string;
  onRemove?: () => void;
  onPress?: () => void;
  onLocationPress?: () => void;
  onDigitalPress?: () => void;
  locationLabel?: string | null;
  digitalLabel?: string | null;
  locationSubLabel?: string | null;
  digitalSubLabel?: string | null;
  /** List of blocked app IDs to display icons for */
  appIds?: string[] | null;
  onRulePress?: () => void;
  ruleLabel?: string | null;
  ruleSubLabel?: string | null;
  key?: any;
};

const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);
const UScrollView = withUniwind(ScrollView);

/**
 * TimeSlotCard Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Vertical-stack UI with a smooth slide-down animated drawer.
 *
 * APP ICONS:
 *   If appIds are provided, it renders a horizontal scrollable strip of 10x10 icons
 *   resolved from the global useAppStore.
 */
export function TimeSlotCard({ 
  startTime, 
  endTime, 
  onRemove, 
  onPress,
  onLocationPress,
  onDigitalPress,
  locationLabel,
  digitalLabel,
  locationSubLabel,
  digitalSubLabel,
  appIds,
  onRulePress,
  ruleLabel,
  ruleSubLabel,
}: TimeSlotCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  /** Ref-based height tracking — no re-renders, no jitter */
  const measuredHeight = useRef(0);
  const isExpandedRef = useRef(false);
  
  const animatedHeight = useSharedValue(0);
  const animatedOpacity = useSharedValue(0);

  // ── Resolve App Icons ──
  const allApps = useAppStore((s) => s.apps);
  const resolvedIcons = useMemo(() => {
    if (!appIds || appIds.length === 0) return [];
    return appIds.map(id => {
      const match = allApps.find(a => a.id === id);
      return match?.iconUri || null;
    }).filter(icon => icon !== null);
  }, [appIds, allApps]);

  const onContentLayout = useCallback((e: any) => {
    const height = e.nativeEvent.layout.height;
    if (height > 0) {
      measuredHeight.current = height;
      if (isExpandedRef.current) {
        animatedHeight.value = withTiming(height, {
          duration: 150,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }
    }
  }, [animatedHeight]);

  function toggleExpand(e: any) {
    e.stopPropagation();
    const expanding = !isExpanded;
    setIsExpanded(expanding);
    isExpandedRef.current = expanding;

    animatedHeight.value = withTiming(
      expanding ? (measuredHeight.current || 200) : 0, 
      { duration: 280, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
    );
    animatedOpacity.value = withTiming(
      expanding ? 1 : 0, 
      { duration: 200 }
    );
  }

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    opacity: animatedOpacity.value,
    overflow: 'hidden' as const,
  }));

  const hasLocation = !!locationLabel;
  const hasDigital = !!digitalLabel;
  const hasRule = !!ruleLabel;

  return (
    <UView className="mb-3 w-full rounded-3xl bg-[#1A1A1A] overflow-hidden">
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

        {(hasLocation || hasDigital) && (
          <UView className="ml-2 mr-0 w-2 h-2 rounded-full bg-[#FF3B30]" />
        )}

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
          style={{ position: 'absolute', width: '100%' }}
        >
          <UView className="border-t border-white/20">
            {/* ── Location Row ── */}
            <UPressable 
              onPress={onLocationPress}
              className="flex-row items-center px-4 py-3 border-b border-white/20"
            >
              <MaterialCommunityIcons 
                name="map-marker-outline" 
                size={28} 
                color="#9CA3AF" 
                style={{ marginRight: 16 }} 
              />
              <UView className="flex-1">
                <UView className="flex-row items-center justify-between">
                  <BodyText className="mt-0 text-gray-400 text-sm">Location</BodyText>
                  {locationSubLabel && (
                    <BodyText className="text-[10px] text-blue-400/80 font-bold uppercase tracking-wider">{locationSubLabel}</BodyText>
                  )}
                </UView>
                <BodyText className={`text-base mt-0.5 ${hasLocation ? 'text-white' : 'text-gray-500'}`} numberOfLines={1}>
                  {locationLabel || "Tap to set"}
                </BodyText>
              </UView>
            </UPressable>

            {/* ── App Block Row ── */}
            <UPressable 
              onPress={onDigitalPress}
              className="flex-row items-center px-4 py-3 border-b border-white/20"
            >
              <MaterialCommunityIcons 
                name="cellphone-lock" 
                size={28} 
                color="#9CA3AF" 
                style={{ marginRight: 16 }} 
              />
              <UView className="flex-1">
                <UView className="flex-row items-center justify-between">
                  <BodyText className="mt-0 text-gray-400 text-sm">App block</BodyText>
                  {digitalSubLabel && (
                    <BodyText className="text-[10px] text-blue-400/80 font-bold uppercase tracking-wider">{digitalSubLabel}</BodyText>
                  )}
                </UView>
                
                {resolvedIcons.length > 0 ? (
                  <UScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    className="mt-1"
                  >
                    {resolvedIcons.map((uri, i) => (
                      <View 
                        key={i} 
                        style={{ marginRight: 12, width: 36, height: 36, borderRadius: 8, overflow: 'hidden' }}
                      >
                        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                      </View>
                    ))}
                  </UScrollView>
                ) : (
                  <BodyText className={`text-base mt-0.5 ${hasDigital ? 'text-white' : 'text-gray-500'}`}>
                    {digitalLabel || "Tap to set"}
                  </BodyText>
                )}
              </UView>
            </UPressable>

            {/* ── Rules Row ── */}
            <UPressable 
              onPress={onRulePress}
              className="flex-row items-center px-4 py-3 border-b border-white/20"
            >
              <MaterialCommunityIcons 
                name="format-list-checks" 
                size={28} 
                color="#9CA3AF" 
                style={{ marginRight: 16 }} 
              />
              <UView className="flex-1">
                <UView className="flex-row items-center justify-between">
                  <BodyText className="mt-0 text-gray-400 text-sm">Rules</BodyText>
                  {ruleSubLabel && (
                    <BodyText className="text-[10px] text-blue-400/80 font-bold uppercase tracking-wider">{ruleSubLabel}</BodyText>
                  )}
                </UView>
                <BodyText className={`text-base mt-0.5 ${hasRule ? 'text-white' : 'text-gray-500'}`} numberOfLines={1}>
                  {ruleLabel || "Tap to set"}
                </BodyText>
              </UView>
            </UPressable>

            {/* ── Delete Slot Action ── */}
            <UPressable 
              onPress={onRemove}
              className="flex-row items-center justify-center py-3 gap-2"
            >
              <MaterialCommunityIcons name="delete-outline" size={26} color="#FF3B30" />
              <BodyText className="text-[#FF3B30] text-sm">Remove</BodyText>
            </UPressable>
          </UView>
        </View>
      </Animated.View>
    </UView>
  );
}
