import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, TextInput, Pressable, Animated, KeyboardAvoidingView, Platform, Keyboard, Dimensions, ActivityIndicator, LayoutChangeEvent, KeyboardEvent, ScrollView } from 'react-native';
import Svg, { Text as SvgText, TSpan, Line, Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import AnimatedReanimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BodyText, HeaderTitle } from '@/components/ui/text';
import { useMutation } from 'convex/react';
import { api } from '@commit/backend/convex/_generated/api';

const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);
const UTextInput = withUniwind(TextInput);

// -------------------------------------------------------------------------
// LiveCaptcha: THE SECURE SVG RENDERER
// -------------------------------------------------------------------------
function LiveCaptcha({ text, width, height }: { text: string; width: number; height: number }) {
  // Seed-based random for consistency within a single challenge
  const seed = useMemo(() => 
    text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0), 
  [text]);

  const pseudoRandom = (n: number) => {
    const x = Math.sin(seed + n) * 10000;
    return x - Math.floor(x);
  };

  const characters = text.split('');

  return (
    <UView className="overflow-hidden" style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="textGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#111" />
            <Stop offset="1" stopColor="#444" />
          </LinearGradient>
        </Defs>

        {/* Background Noise Layer 1: Fine Grain */}
        {[...Array(50)].map((_, i) => (
          <Circle
            key={`grain-${i}`}
            cx={pseudoRandom(i) * width}
            cy={pseudoRandom(i + 1) * height}
            r={0.8}
            fill="#e0e0e0"
          />
        ))}

        {/* Background Noise Layer 2: Distant Lines */}
        {[...Array(8)].map((_, i) => (
          <Line
            key={`bg-line-${i}`}
            x1={pseudoRandom(i + 10) * width}
            y1={pseudoRandom(i + 11) * height}
            x2={pseudoRandom(i + 12) * width}
            y2={pseudoRandom(i + 13) * height}
            stroke="#f0f0f0"
            strokeWidth={1.5}
          />
        ))}

        {/* The Distorted Characters */}
        {characters.map((char, i) => {
          const charWidth = width / (characters.length + 1);
          const x = (i + 0.8) * charWidth;
          const y = height / 2 + (pseudoRandom(i + 20) * 10 - 5);
          const rotate = (pseudoRandom(i + 30) * 40 - 20); // -20 to 20 deg
          const scale = 0.9 + pseudoRandom(i + 40) * 0.3; // 0.9 to 1.2
          const dy = pseudoRandom(i + 50) * 15 - 7.5;

          return (
            <SvgText
              key={`char-${i}`}
              x={x}
              y={y}
              fontSize={42}
              fontWeight="900"
              fill="url(#textGrad)"
              textAnchor="middle"
              transform={`rotate(${rotate}, ${x}, ${y}) scale(${scale})`}
              opacity={0.9}
            >
              <TSpan dy={dy}>{char}</TSpan>
            </SvgText>
          );
        })}

        {/* Foreground Interference: Wavy "Security" Path */}
        <Path
          d={`M 0 ${height / 2} Q ${width / 4} ${height / 4}, ${width / 2} ${height / 2} T ${width} ${height / 2}`}
          fill="none"
          stroke="#000"
          strokeWidth="1"
          opacity={0.1}
        />
        
        <Path
          d={`M 0 ${height / 3} Q ${width / 3} ${height}, ${width} ${height / 2}`}
          fill="none"
          stroke="#000"
          strokeWidth="1"
          opacity={0.08}
        />

        {/* Final Polish: Blotches */}
        {[...Array(5)].map((_, i) => (
          <Circle
            key={`blotch-${i}`}
            cx={pseudoRandom(i + 80) * width}
            cy={pseudoRandom(i + 81) * height}
            r={pseudoRandom(i + 82) * 4}
            fill="#000"
            opacity={0.03}
          />
        ))}
      </Svg>
    </UView>
  );
}

export function CaptchaWaiverView({ event, onClose }: { event: any; onClose: () => void }) {
  const [solution, setSolution] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const keyboardHeight = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });

  const submitChallenge = useMutation(api.api.instances.waivers.submitChallenge);

  const waiverState = event?.waiver_state;
  const challenges = waiverState?.challenges || [];
  
  // Pick the most recent pending challenge
  const pendingChallenges = challenges
    .filter((c: any) => c.status === 'pending')
    .sort((a: any, b: any) => b.created_at - a.created_at);
  
  const currentChallenge = pendingChallenges[0];

  const totalQuota = event?.penalty_waiver?.config?.count || 1;
  const completedChallenges = challenges.filter((c: any) => c.status === 'completed').length;
  const percentage = (completedChallenges / totalQuota) * 100;
  
  const expiresAt = waiverState?.expires_at;

  const handleSubmit = async () => {
    if (!solution || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const result = await submitChallenge({
        instanceId: event._id,
        solution: solution.trim()
      });

      if (result.success) {
        setSolution('');
        if (result.quotaReached) {
          onClose(); // Penalty waived, close session
        }
      } else {
        setErrorTitle(result.message || "Incorrect solution");
        setErrorVisible(true);
      }
    } catch (e) {
      console.error("[CaptchaWaiver] Submit error:", e);
      setErrorTitle("Verification failed. Please check your connection.");
      setErrorVisible(true);
    } finally {
      setIsSubmitting(false);
      // Keep focus on the input after submission completes
      setTimeout(() => inputRef.current?.focus(), 100);
    }
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
      (e: KeyboardEvent) => {
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
    <ScrollView 
      contentContainerStyle={{ flex: 1 }} 
      keyboardShouldPersistTaps="always" 
      scrollEnabled={false}
      className="bg-[#121212]"
    >
      <UView className="flex-1">
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
            {completedChallenges}/{totalQuota} SOLVED
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

      {/* Challenge Area (Measureable Gap) */}
      <UView style={{ height: gapHeight }} className="justify-center items-center mt-4 px-6">
        <UView 
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setContainerDims({ width, height });
          }}
          className="w-full h-full bg-[#fdfdfd] rounded-3xl overflow-hidden justify-center items-center shadow-2xl border border-[#2A2A2A]"
        >
            {currentChallenge && containerDims.width > 0 ? (
              <LiveCaptcha 
                text={currentChallenge.vault.secret} 
                width={containerDims.width}
                height={containerDims.height}
              />
            ) : !currentChallenge ? (
             <BodyText className="text-gray-600">No pending challenges</BodyText>
           ) : null}
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
              ref={inputRef}
              className="flex-1 ml-2 text-white text-lg"
              placeholder="Type the solution"
              placeholderTextColor="#666"
              value={solution}
              onChangeText={setSolution}
              autoFocus
              returnKeyType="send"
              autoCapitalize="none"
              onSubmitEditing={handleSubmit}
              blurOnSubmit={false}
            />
            {solution.length > 0 && (
              <UPressable 
                onPress={handleSubmit} 
                disabled={isSubmitting}
                className="ml-2"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <MaterialCommunityIcons name="arrow-up-circle" size={32} color="#3B82F6" />
                )}
              </UPressable>
            )}
          </UView>
        </UView>
      </AnimatedReanimated.View>

      {/* In-Page Error Overlay (Fixes Keyboard Dismissal on Failure) */}
      {errorVisible && (
        <UView 
          style={{ 
            position: 'absolute', 
            top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.6)', 
            justifyContent: 'center', 
            alignItems: 'center',
            paddingHorizontal: 30,
            zIndex: 1000 
          }}
        >
          <UView className="w-full rounded-3xl bg-[#252525] p-6 shadow-2xl">
            <HeaderTitle className="text-center text-lg font-bold text-white mb-6">
              {errorTitle}
            </HeaderTitle>
            
            <UPressable 
              onPress={() => {
                setErrorVisible(false);
                // Refs aren't lost, so focus is lightning fast
                inputRef.current?.focus();
              }}
              className="mt-2"
            >
              <BodyText className="text-center text-[#4FA0FF] font-black text-base uppercase tracking-widest">
                Try again
              </BodyText>
            </UPressable>
          </UView>
        </UView>
      )}
    </UView>
    </ScrollView>
  );
}
