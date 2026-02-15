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
  // Calculate shine animation
  const translateX = useSharedValue(-100); 

  useEffect(() => {
    // Wait for layout to start animation correctly or just use a generic large value if width is percentage
    // Actually, simple % based animation is safer
  }, []);
  
  const shineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: withRepeat(withTiming(150, { duration: 1500, easing: Easing.linear }), -1, false) }] 
      // Wait, 150 is arbitrary. If width is 100%, we need percentage.
      // Reanimated supports percentage strings in translate?
      // "100%"
    };
  });
  
  // Use a simpler approach: Opacity Pulse with a wider range to simulate "shine/glow" if gradient is missing
  // User asked for "shine thruh". 
  // without linear gradient, an opacity wave is the best approximation unless I implement the moving bar.
  
  // Let's implement the moving bar with onLayout to get width.
  const [layoutWidth, setLayoutWidth] = React.useState(0);
  
  const animatedShine = useAnimatedStyle(() => {
     if (layoutWidth === 0) return {};
     return {
        transform: [{ translateX: withRepeat(withSequence(withTiming(layoutWidth, { duration: 1000, easing: Easing.inOut(Easing.ease) }), withTiming(-layoutWidth, { duration: 0 })), -1, false) }]
        // Wait, start at -layoutWidth, go to layoutWidth.
        // need to control initial value.
     };
  });
  
  // Reset shared value
  const x = useSharedValue(-100);
  useEffect(() => {
      if (layoutWidth > 0) {
          x.value = -layoutWidth;
          x.value = withRepeat(
            withTiming(layoutWidth * 2, { duration: 1500, easing: Easing.linear }),
            -1,
            false
          );
      }
  }, [layoutWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }]
  }));

  const baseStyle: ViewStyle = {
    backgroundColor: '#333333', 
    overflow: 'hidden',
    width: width as any,
    height: height as any,
    borderRadius,
  };

  return (
    <View 
      style={[baseStyle, style]} 
      className={className}
      onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
    >
        <Animated.View 
            style={[
                { width: 20, height: '100%', backgroundColor: 'rgba(255,255,255,0.1)', opacity: 0.5 }, 
                animatedStyle
            ]} 
        />
    </View>
  );
}
