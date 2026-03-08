import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, TextInput, Pressable, Image, FlatList, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BodyText, HeaderTitle } from '@/components/ui/text';

const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);
const UTextInput = withUniwind(TextInput);

export function WaiverActionModal({ visible, event, onClose }: { visible: boolean; event: any; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const progress = event?.waiver_state?.progress || { current: 0, total: 10 };
  const percentage = Math.min((progress.current / progress.total) * 100, 100);
  const expiresAt = event?.waiver_state?.expires_at;

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

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <UView className="flex-1 bg-[#121212]">
        {/* Header */}
        <UView className="flex-row items-center px-4 pt-12 pb-4">
          <UPressable onPress={onClose} className="mr-6">
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </UPressable>
          <HeaderTitle className="text-xl text-white">Solve captcha</HeaderTitle>
        </UView>

        {/* Challenge Input */}
        <UView className="px-4 mb-2">
          <UView className="flex-row items-center bg-[#2A2A2A] rounded-full px-4 py-2">
            <MaterialCommunityIcons name="robot-outline" size={20} color="#666" />
            <UTextInput
              className="flex-1 ml-2 text-white text-base"
              placeholder="Type the solution"
              placeholderTextColor="#666"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </UView>
        </UView>

        {/* Progress Tracker */}
        <UView className="px-6 mt-1">
          <UView className="flex-row justify-between items-center mb-3">
            <BodyText className="text-gray-400 text-xs font-bold">
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
          
          <UView className="w-full h-2.5 bg-[#2A2A2A] rounded-full overflow-hidden">
            <UView 
                className="h-full bg-green-500 rounded-full" 
                style={{ width: `${percentage}%` }}
              />
          </UView>
        </UView>

      </UView>
    </Modal>
  );
}
