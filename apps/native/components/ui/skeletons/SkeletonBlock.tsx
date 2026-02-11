import React, { useEffect } from 'react';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing
} from 'react-native-reanimated';
import { ViewStyle, StyleProp } from 'react-native';
import { withUniwind } from 'uniwind';
import { View } from 'react-native';

const UView = withUniwind(View);

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  className?: string; // Support for Uniwind classes
  delay?: number;
}

export function SkeletonBlock({ 
  width, 
  height, 
  borderRadius = 8, 
  style, 
  className = "",
  delay = 0 
}: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    // Stagger the animation slightly for a natural feel if needed
    const timeout = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true // reverse
      );
    }, delay);

    return () => clearTimeout(timeout);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Combine styles
  const baseStyle: ViewStyle = {
    backgroundColor: '#333333', // Default skeleton color matching dark theme
    width: width as any,
    height: height as any,
    borderRadius,
  };

  return (
    <Animated.View 
      style={[baseStyle, style, animatedStyle]} 
      className={className} // Pass className for easier styling
    />
  );
}
