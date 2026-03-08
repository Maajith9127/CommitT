import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Pressable, Animated, KeyboardAvoidingView, Platform, Keyboard, Dimensions } from 'react-native';
import AnimatedReanimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BodyText, HeaderTitle } from '@/components/ui/text';

const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);
const UTextInput = withUniwind(TextInput);

export function CaptchaWaiverView({ event, onClose }: { event: any; onClose: () => void }) {
  const [solution, setSolution] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const keyboardHeight = useSharedValue(0);

  const progress = event?.waiver_state?.progress || { current: 0, total: 10 };
  const percentage = Math.min((progress.current / progress.total) * 100, 100);
  const expiresAt = event?.waiver_state?.expires_at;

  const handleSubmit = async () => {
    if (!solution) return;

    console.log("Submitting solution:", solution);
    // Placeholder for submission logic
    alert(`Solution submitted: ${solution}. This is a placeholder.`);
    setSolution(''); // Clear input
    onClose();
  };

  // -------------------------------------------------------------------------
  // UI CALCULATIONS & ANIMATIONS
  // -------------------------------------------------------------------------
  const windowHeight = Dimensions.get('window').height;
  const ESTIMATED_KEYBOARD = 300; 
  const FIXED_UI_OVERHEAD = 240; 
  const gapHeight = windowHeight - ESTIMATED_KEYBOARD - FIXED_UI_OVERHEAD;

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsUrgent(true);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const secondsStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
      setTimeLeft(`${minutes}:${secondsStr}`);
      setIsUrgent(minutes < 5);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    if (isUrgent) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isUrgent]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        keyboardHeight.value = withTiming(e.endCoordinates.height, { duration: 250 });
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        keyboardHeight.value = withTiming(0, { duration: 250 });
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const animatedInputBarStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardHeight.value }],
  }));

  return (
    <UView className="flex-1 bg-[#121212]">
      {/* Header */}
      <UView className="flex-row items-center px-4 pt-12 pb-4">
        <UPressable onPress={onClose} className="mr-6">
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </UPressable>
        <HeaderTitle className="text-xl text-white">Solve captcha</HeaderTitle>
      </UView>

      {/* Progress Tracker (Sticky at Top) */}
      <UView className="px-6 mt-1">
        <UView className="flex-row justify-between items-center mb-3">
          <BodyText className="text-gray-400 text-xs font-bold uppercase">
            {progress.current}/{progress.total} SOLVED
          </BodyText>

          {timeLeft ? (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <BodyText 
                className="font-bold text-xs" 
                style={{ color: isUrgent ? '#FF3B30' : '#888' }}
              >
                {timeLeft} REMAINING
              </BodyText>
            </Animated.View>
          ) : null}
        </UView>
        
        <UView className="w-full h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
          <UView 
              className="h-full bg-blue-500 rounded-full" 
              style={{ width: `${percentage}%` }}
            />
        </UView>
      </UView>

      {/* Challenge Area (Fixed Size Gap) */}
      <UView style={{ height: gapHeight }} className="justify-center items-center mt-4 px-6">
        <UView className="w-full h-full bg-[#1A1A1A] rounded-3xl overflow-hidden justify-center items-center shadow-2xl">
           <MaterialCommunityIcons name="image-outline" size={48} color="#222" />
           <BodyText className="text-gray-700 mt-2 font-medium">Challenge Area</BodyText>
        </UView>
      </UView>

      {/* Flexible Spacer */}
      <UView className="flex-1" />

      {/* Interaction Bar */}
      <AnimatedReanimated.View style={animatedInputBarStyle}>
        <UView className="px-4 py-3 border-t border-[#1F1F1F] bg-[#121212]">
          <UView className="flex-row items-center bg-[#2A2A2A] rounded-2xl px-4 py-3">
            <MaterialCommunityIcons name="robot-outline" size={20} color="#888" />
            <UTextInput
              className="flex-1 ml-2 text-white text-lg"
              placeholder="Type the solution"
              placeholderTextColor="#666"
              value={solution}
              onChangeText={setSolution}
              autoFocus
              returnKeyType="send"
              autoCapitalize="none"
              onSubmitEditing={handleSubmit}
            />
          </UView>
        </UView>
      </AnimatedReanimated.View>
    </UView>
  );
}
