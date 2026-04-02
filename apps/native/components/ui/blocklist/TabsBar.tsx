import React, { useEffect, useState } from "react";
import { View, Pressable, LayoutChangeEvent } from "react-native";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming 
} from "react-native-reanimated";
import { withUniwind } from "uniwind";
import { AuthTitle } from "@/components/ui/text";

const UView = withUniwind(View);
const UPress = withUniwind(Pressable);

type Tab = {
  key: string;
  label: string;
};

type TabsBarProps = {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
};

/**
 * TabsBar — High-Performance Sliding Tab Navigator
 * ─────────────────────────────────────────────────────────────────────────────
 * PRODUCTION RATIONALE:
 *   Instead of conditional border-swapping which causes visual jitter, 
 *   we use a floating Animated.View as an indicator. This provides a 
 *   fluid, native "slide" feel as the user moves between categories.
 * 
 * SCALABILITY:
 *   Uses onLayout to dynamically calculate tab widths, ensuring it works
 *   perfectly regardless of screen size or tab count.
 */
export function TabsBar({ tabs, activeTab, onChange }: TabsBarProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const indicatorPosition = useSharedValue(0);
  
  const tabWidth = containerWidth / (tabs.length || 1);
  const activeIndex = tabs.map((t: Tab) => t.key).indexOf(activeTab);

  // Sync animation position when activeIndex changes
  useEffect(() => {
    if (containerWidth > 0 && activeIndex !== -1) {
      indicatorPosition.value = withTiming(activeIndex * tabWidth, {
        duration: 180,
      });
    }
  }, [activeIndex, tabWidth, containerWidth]);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    width: tabWidth,
    transform: [{ translateX: indicatorPosition.value }],
  }));

  return (
    <UView 
      className="flex-row border-b border-[#2A2A2A] -mx-4 relative" 
      onLayout={onLayout}
    >
      {/* ── Sliding Indicator (Native Animated Layer) ── */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: -1, // Sits exactly on the bottom border
            height: 3,
            backgroundColor: '#4FA0FF',
            zIndex: 10,
          },
          animatedIndicatorStyle
        ]}
      />

      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <UPress 
            key={tab.key} 
            onPress={() => onChange(tab.key)} 
            className="flex-1"
            activeOpacity={1} // Prevent default button feedback so the indicator is the focus
          >
            <UView className="py-3 items-center">
              <AuthTitle
                className={`mb-0 text-xl font-medium transition-colors duration-200 ${
                  isActive ? "text-[#4FA0FF]" : "text-gray-400"
                }`}
              >
                {tab.label}
              </AuthTitle>
            </UView>
          </UPress>
        );
      })}
    </UView>
  );
}
