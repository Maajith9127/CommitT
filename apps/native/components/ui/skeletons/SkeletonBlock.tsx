import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { ViewStyle, StyleProp } from "react-native";
import { withUniwind } from "uniwind";

const UAnimatedView = withUniwind(Animated.View);

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  className?: string; // Support for Uniwind classes
  delay?: number;
}

/**
 * SkeletonBlock
 *
 * A highly optimized, hardware-accelerated loading placeholder.
 * Uses a smooth Opacity Pulse. We avoid TranslateX/Layout calculations
 * because rendering 30+ blocks with `onLayout` and nested translating views
 * causes severe frame drops on Android devices.
 */
export function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
  style,
  className = "",
  delay = 0,
}: SkeletonProps) {
  // Base opacity value. We pulse between 0.2 and 0.6.
  const opacity = useSharedValue(0.2);

  useEffect(() => {
    // 800ms fade-in, 800ms fade-out, looping infinitely.
    opacity.value = withRepeat(
      withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1, // Infinite loop
      true // Reverse on each loop (yo-yo effect)
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const baseStyle: ViewStyle = {
    backgroundColor: "#333333", // Base skeleton color
    width: width as any,
    height: height as any,
    borderRadius,
  };

  return (
    <UAnimatedView
      style={[baseStyle, style, animatedStyle]}
      className={className}
    />
  );
}
