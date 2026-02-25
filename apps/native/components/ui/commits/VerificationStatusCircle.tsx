import React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BodyText } from '@/components/ui/text';

const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);

type StatusType = 'neutral' | 'verified' | 'failed' | 'applied' | 'waived' | 'percentage';

export interface VerificationCircleProps {
  status?: StatusType;
  /** Percentage to show when status is 'percentage' (0 to 100) */
  percentage?: number;
  /** Callback when circle is tapped (only fires for 'neutral' status) */
  onPress?: () => void;
  /** Show a spinner while verification is in progress */
  isLoading?: boolean;
}

/**
 * Universal Verification Circle.
 * Can be plugged anywhere to display visually whether a rule/condition passed or failed.
 */
export function VerificationStatusCircle({ status = 'neutral', percentage = 0, onPress, isLoading = false }: VerificationCircleProps) {
  const baseOuterClass = "w-12 h-12 rounded-full border border-white/40 justify-center items-center bg-white/5";
  const iconColor = "#D1D5DB";

  // Loading state: spinner while backend is processing
  if (isLoading) {
    return (
      <UView className={baseOuterClass}>
        <ActivityIndicator size="small" color={iconColor} />
      </UView>
    );
  }

  if (status === 'verified') {
    return (
      <UView className={baseOuterClass}>
        <MaterialCommunityIcons name="check" size={24} color={iconColor} />
      </UView>
    );
  }

  if (status === 'failed') {
    // Failed but retryable — if onPress is provided, wrap in Pressable
    if (onPress) {
      return (
        <UPressable className={baseOuterClass} onPress={onPress}>
          <MaterialCommunityIcons name="refresh" size={24} color={iconColor} />
        </UPressable>
      );
    }
    return (
      <UView className={baseOuterClass}>
        <MaterialCommunityIcons name="close" size={24} color={iconColor} />
      </UView>
    );
  }

  if (status === 'applied') {
    return (
      <UView className={baseOuterClass}>
        <MaterialCommunityIcons name="flag-checkered" size={24} color={iconColor} />
      </UView>
    );
  }

  if (status === 'waived') {
    return (
      <UView className={baseOuterClass}>
        <MaterialCommunityIcons name="shield-check-outline" size={24} color={iconColor} />
      </UView>
    );
  }

  if (status === 'percentage') {
    return (
      <UView className={baseOuterClass}>
        <MaterialCommunityIcons name="percent" size={24} color={iconColor} />
      </UView>
    );
  }

  // neutral — tappable if onPress is provided
  if (onPress) {
    return (
      <UPressable className={baseOuterClass} onPress={onPress}>
        <MaterialCommunityIcons name="cursor-pointer" size={24} color={iconColor} />
      </UPressable>
    );
  }

  return (
    <UView className={baseOuterClass}>
      <MaterialCommunityIcons name="cursor-pointer" size={24} color={iconColor} />
    </UView>
  );
}
