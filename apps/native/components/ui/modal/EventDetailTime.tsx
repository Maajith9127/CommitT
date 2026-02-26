/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  EventDetailTime — Time Window Section with Verification Circle             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                             ║
 * ║  Renders the time section of the EventDetailModal:                          ║
 * ║  • "All-day" row with a tappable VerificationStatusCircle                   ║
 * ║  • Start date/time                                                          ║
 * ║  • End date/time                                                            ║
 * ║  • Timezone label                                                           ║
 * ║                                                                             ║
 * ║  The VerificationStatusCircle is interactive — tapping it triggers          ║
 * ║  the time verification flow via the `onVerify` callback.                    ║
 * ║                                                                             ║
 * ║  This is a PRESENTATIONAL component. The verification logic                 ║
 * ║  (mutation, state updates) lives in EventDetailModal.                       ║
 * ║                                                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BodyText } from '@/components/ui/text';
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';
import dayjs from 'dayjs';

// ── Uniwind-wrapped primitives ──────────────────────────────────────────────
const UView = withUniwind(View);

// ── Types ───────────────────────────────────────────────────────────────────

export interface EventDetailTimeProps {
  /** Instance start timestamp (ms epoch) */
  start: number;
  /** Instance end timestamp (ms epoch) */
  end: number;
  /** Current verification status for the time condition */
  timeStatus: string;
  /** Whether the time verification is currently in flight */
  isVerifying: boolean;
  /** Callback to trigger time verification */
  onVerify: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function EventDetailTime({
  start,
  end,
  timeStatus,
  isVerifying,
  onVerify,
}: EventDetailTimeProps) {
  return (
    <UView className="border-t border-b border-white/20 mt-6 py-6 px-6">

      {/* All Day Row — tappable circle triggers time verification */}
      <UView className="flex-row items-center mb-6">
        <MaterialCommunityIcons
          name="clock-time-four-outline"
          size={28}
          color="#9CA3AF"
          style={{ marginRight: 16 }}
        />
        <UView className="flex-1 mr-4 overflow-hidden">
          <BodyText className="text-white text-base">All-day</BodyText>
        </UView>
        <VerificationStatusCircle
          status={timeStatus as any}
          onPress={onVerify}
          isLoading={isVerifying}
        />
      </UView>

      {/* Start Time */}
      <UView className="flex-row justify-between mb-4 pl-10">
        <BodyText className="text-white text-base">
          {dayjs(start).format('ddd, D MMM YYYY')}
        </BodyText>
        <BodyText className="text-white text-base">
          {dayjs(start).format('h:mm a')}
        </BodyText>
      </UView>

      {/* End Time */}
      <UView className="flex-row justify-between mb-6 pl-10">
        <BodyText className="text-white text-base">
          {dayjs(end).format('ddd, D MMM YYYY')}
        </BodyText>
        <BodyText className="text-white text-base">
          {dayjs(end).format('h:mm a')}
        </BodyText>
      </UView>

      {/* Timezone */}
      <UView className="flex-row items-center">
        <MaterialCommunityIcons
          name="earth"
          size={24}
          color="#9CA3AF"
          style={{ marginRight: 16 }}
        />
        <BodyText className="text-gray-300 text-base">India Standard Time</BodyText>
      </UView>

    </UView>
  );
}
