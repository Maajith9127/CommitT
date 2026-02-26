/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  EventDetailTime — Time Window Section with Verification Circle              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Renders the time section of the EventDetailModal:                           ║
 * ║  • "All-day" row with a tappable VerificationStatusCircle                    ║ 
 * ║  • Start date/time                                                           ║
 * ║  • End date/time                                                             ║
 * ║  • Timezone label                                                            ║
 * ║                                                                              ║
 * ║  The VerificationStatusCircle is interactive — tapping it triggers           ║
 * ║  the time verification flow via the `onVerify` callback.                     ║
 * ║                                                                              ║
 * ║  This is a PRESENTATIONAL component. The verification logic                  ║
 * ║  (mutation, state updates) lives in EventDetailModal.                        ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Animated } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BodyText } from '@/components/ui/text';
import dayjs from 'dayjs';

// ── Uniwind-wrapped primitives ──────────────────────────────────────────────
const UView = withUniwind(View);

// ── Types ───────────────────────────────────────────────────────────────────

export interface EventDetailTimeProps {
  /** Instance start timestamp (ms epoch) */
  start: number;
  /** Instance end timestamp (ms epoch) */
  end: number;
}

// ── Component ───────────────────────────────────────────────────────────────

export function EventDetailTime({
  start,
  end,
}: EventDetailTimeProps) {
  const [now, setNow] = useState(Date.now());
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Clock tick
    const timer = setInterval(() => setNow(Date.now()), 1000);
    
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      clearInterval(timer);
      opacityAnim.stopAnimation();
    };
  }, [opacityAnim]);

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);

    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  let timerLabel = '';
  let timerValue = '';
  let timerTextColor = '';

  if (now < start) {
    timerLabel = 'Starts-in';
    timerValue = formatCountdown(start - now);
    timerTextColor = 'text-white';
  } else if (now > end) {
    timerLabel = 'Status';
    timerValue = 'Expired';
    timerTextColor = 'text-red-500';
  } else {
    timerLabel = 'Expires-in';
    timerValue = formatCountdown(end - now);
    timerTextColor = 'text-green-500';
  }

  return (
    <UView className="border-t border-b border-white/20 mt-6 py-6 px-6">

      {/* Ticker Row */}
      <UView className="flex-row items-center mb-6">
        <MaterialCommunityIcons
          name="clock-time-four-outline"
          size={28}
          color="#9CA3AF"
          style={{ marginRight: 12 }}
        />
        <UView className="flex-1 mr-4 overflow-hidden">
          <BodyText className="text-white text-base">{timerLabel}</BodyText>
        </UView>
        <Animated.View style={{ opacity: opacityAnim }}>
          <BodyText className={`text-base font-bold ${timerTextColor}`}>
            {timerValue}
          </BodyText>
        </Animated.View>
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
