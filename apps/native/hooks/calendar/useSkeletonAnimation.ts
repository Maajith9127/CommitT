import { useState, useEffect } from 'react';
import { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';

/**
 * useSkeletonAnimation
 * 
 * Manages the visibility and fade-out animation of the loading skeleton.
 * Returns both the boolean visibility state and the animated style for the overlay.
 */
export function useSkeletonAnimation(duration: number = 4000) {
  const [showSkeleton, setShowSkeleton] = useState(true);
  const skeletonOpacity = useSharedValue(1);

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  useEffect(() => {
    // Keep skeleton visible for `duration`, then fade out
    const timer = setTimeout(() => {
      skeletonOpacity.value = withTiming(0, { duration: 800 }, (finished) => {
        if (finished) {
          runOnJS(setShowSkeleton)(false);
        }
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, skeletonOpacity]);

  return {
    showSkeleton,
    animatedOverlayStyle,
  };
}
