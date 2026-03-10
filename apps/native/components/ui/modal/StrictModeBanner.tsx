import React from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BodyText } from '@/components/ui/text';
import dayjs from 'dayjs';

const UView = withUniwind(View);

import { ConditionCard } from '../commits/ConditionCard';

interface StrictModeBannerProps {
  strictUntil: number;
}

/**
 * StrictModeBanner
 * 
 * Reusable UI component that displays the lockdown status of a task instance.
 * Uses the standard ConditionCard aesthetic for UI consistency.
 */
export function StrictModeBanner({ strictUntil }: StrictModeBannerProps) {
  const isLocked = strictUntil && Date.now() < strictUntil;

  if (!isLocked) return null;

  return (
    <UView className="px-6 mt-6">
      <ConditionCard
        icon="lock"
        title="VAULT ACTIVE"
        subtitle={`Locked until ${dayjs(strictUntil).format('MMMM D, YYYY')}`}
        iconColor="#4FA0FF"
        selected={true}
        selectionColor="#4FA0FF"
        className="mb-0 bg-[#232323]"
      />
    </UView>
  );
}
