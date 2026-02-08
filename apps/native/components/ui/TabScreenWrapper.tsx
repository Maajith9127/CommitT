import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useTabContext } from '@/contexts/TabContext';
import Animated, { 
  useAnimatedStyle, 
  withTiming,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';

interface TabScreenWrapperProps {
  children: React.ReactNode;
  tabId: string;
  preload?: boolean;
  preserveScroll?: boolean;
}

export function TabScreenWrapper({ 
  children, 
  tabId, 
  preload = true,
  preserveScroll = true 
}: TabScreenWrapperProps) {
  const navigation = useNavigation();
  const { 
    saveTabState, 
    getTabState, 
    shouldPreload,
    markTabVisited 
  } = useTabContext();
  
  const opacity = useSharedValue(0);
  const isMountedRef = useRef(false);
  const scrollPositionRef = useRef(0);
  const contentRef = useRef<any>(null);

  // Animation styles
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: opacity.value }],
  }));

  // Handle tab focus
  useFocusEffect(
    useCallback(() => {
      // Mark as visited
      markTabVisited(tabId);
      
      // Animate in
      opacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });

      // Restore scroll position if preserved (future enhancement)
      /*
      if (preserveScroll && contentRef.current) {
        const savedState = getTabState(tabId);
        if (savedState?.scrollPosition) {
          // contentRef.current.scrollTo({ y: savedState.scrollPosition, animated: false });
        }
      }
      */

      return () => {
        // Animate out - fast exit
        opacity.value = withTiming(0, {
          duration: 150,
          easing: Easing.in(Easing.cubic),
        });
        
        // Save scroll position (future enhancement)
        /*
        if (preserveScroll && contentRef.current) {
          // saveTabState(tabId, { scrollPosition: scrollPositionRef.current });
        }
        */
      };
    }, [tabId, preserveScroll])
  );

  // Preload content if needed
  useEffect(() => {
    if (preload && shouldPreload(tabId) && !isMountedRef.current) {
      isMountedRef.current = true;
    }
  }, [preload, tabId, shouldPreload]);

  // Don't render if not preloaded (for non-critical tabs)
  if (!preload && !shouldPreload(tabId) && !isMountedRef.current) {
    return (
      <View style={styles.placeholder} />
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        animatedStyle,
      ]}
      ref={contentRef}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#000',
  },
});
