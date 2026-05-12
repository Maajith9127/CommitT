import React, { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolateColor
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface CustomSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  activeColor?: string;
  inactiveColor?: string;
  thumbColor?: string;
}

import { THEME } from "@/constants/theme";

/**
 * CustomSwitch — High-performance Reanimated 3 implementation.
 * 
 * REFACTOR NOTE: 
 * Migrated from legacy Animated API to Reanimated 3 to eliminate 
 * JS-thread jank. Added tactile haptics.
 */
export function CustomSwitch({
  value,
  onValueChange,
  activeColor = THEME.colors.primary,
  inactiveColor = THEME.colors.surfaceElevated,
  thumbColor = THEME.colors.textMain,
}: CustomSwitchProps) {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, {
      mass: 1,
      damping: 15,
      stiffness: 120,
    });
  }, [value]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  };

  const animatedTrackStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [inactiveColor, activeColor]
    );
    return { backgroundColor };
  });

  const animatedThumbStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: progress.value * 20 }
      ],
    };
  });

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.track, animatedTrackStyle]}>
        <Animated.View style={[styles.thumb, { backgroundColor: thumbColor }, animatedThumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: "center",
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 4,
  },
});
