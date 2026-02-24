import React from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BodyText } from '@/components/ui/text';

const UView = withUniwind(View);

type StatusType = 'neutral' | 'verified' | 'failed' | 'partial';

export interface VerificationCircleProps {
  status?: StatusType;
  percentage?: number; // 0 to 100
}

/**
 * Universal Verification Circle.
 * Can be plugged anywhere to display visually whether a rule/condition passed or failed.
 */
export function VerificationStatusCircle({ status = 'neutral', percentage = 0 }: VerificationCircleProps) {
  if (status === 'verified') {
    return (
      <UView className="w-10 h-10 rounded-full border border-green-500 bg-green-500/10 justify-center items-center">
        <MaterialCommunityIcons name="check" size={20} color="#4ADE80" />
      </UView>
    );
  }

  if (status === 'failed') {
    return (
      <UView className="w-10 h-10 rounded-full border border-red-500 bg-red-500/10 justify-center items-center">
        <MaterialCommunityIcons name="close" size={20} color="#F87171" />
      </UView>
    );
  }

  if (status === 'partial') {
    return (
      <UView className="w-10 h-10 rounded-full border border-[#4FA0FF] bg-[#4FA0FF]/10 justify-center items-center">
        <BodyText className="text-[10px] text-[#4FA0FF] font-bold">{Math.round(percentage)}%</BodyText>
      </UView>
    );
  }

  // neutral
  return (
    <UView className="w-10 h-10 rounded-full border border-white/40 justify-center items-center" />
  );
}
