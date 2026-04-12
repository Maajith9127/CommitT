/**
 * EventDetailTime
 * 
 * Component responsible for rendering temporal metadata and verification status
 * within the EventDetailModal.
 * 
 * Features:
 * - Reactive countdown timers (Starts-in, Expires-in, Grace period).
 * - Stay Throughout logic: Memoized calculation of missed checkpoints based 
 *   on real-time temporal comparison.
 * - Pulse animations for active countdowns.
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  /** Instance status */
  status?: string;
  /** Instance config containing constraints like grace_period_minutes */
  config?: any;
  /** Active checkpoints for "stay_throughout" tasks */
  checkpoints?: any[];
  /** Timestamp until which the task cannot be modified */
  strictUntil?: number;
}

// ── Component ───────────────────────────────────────────────────────────────

export function EventDetailTime({
  start,
  end,
  status,
  config,
  checkpoints,
  strictUntil,
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

  const isJustShowUp = config?.verification_style === 'just_show_up';
  const isStayThroughout = config?.verification_style === 'stay_throughout';
  const graceMinutes = config?.grace_period_minutes ?? 0;
  const graceEnd = start + (graceMinutes * 60 * 1000);

  const hasNoCheckpoints = !checkpoints || checkpoints.length === 0;

  if (now < start) {
    timerLabel = 'Starts-in';
    timerValue = formatCountdown(start - now);
    timerTextColor = 'text-white';
  } else if (now > end) {
    timerLabel = 'Status';
    timerValue = status === 'proceeded' ? 'Completed' : 'Expired';
    timerTextColor = status === 'proceeded' ? 'text-green-500' : 'text-red-500';
  } else if (hasNoCheckpoints) {
    // ── Lightweight Protocol Logic (Digital Only) ───────────────────────────
    timerLabel = 'Digital Block';
    timerValue = 'Active (Auto-verify)';
    timerTextColor = 'text-green-500';
  } else if (isStayThroughout) {
    // ── Stay Throughout Logic ────────────────────────────────────────────────
    // In continuous monitoring mode, we tally up failure counts based on 
    // randomized checkpoints. This UI calculate its own "missed" tally
    // to provide high-frequency feedback even when background sync is slow.

    const maxMissed = config?.stay_throughout_config?.max_missed_checkins ?? 0;
    
    /**
     * Tally current missed checkpoints.
     * A checkpoint is missed if: Current Time > Checkpoint End AND it hasn't been verified.
     * This calculation is memoized to prevent unnecessary re-renders unless
     * `checkpoints` or `now` (current time) changes.
     */
    const missedCount = useMemo(() => {
      let count = 0;
      if (checkpoints && Array.isArray(checkpoints)) {
        checkpoints.forEach((cp: any) => {
          const endTime = cp.end ?? cp.window_end_time;
          const isExpired = now > endTime;
          
          // Check if ALL required conditions for this ping were met
          const statusVals = Object.keys(cp.verification_status || {}).map((k: string) => cp.verification_status[k]);
          const allVerified = statusVals.length > 0 && statusVals.every((v: any) => v === "verified");
          
          if (isExpired && !allVerified) count++;
        });
      }
      return count;
    }, [checkpoints, now]);

    timerLabel = 'Missed Check-ins';
    timerValue = `${missedCount} / ${maxMissed} Max`;
    // Determine text color based on missed count vs max allowed
    if (missedCount === 0) {
      timerTextColor = 'text-green-500';
    } else if (missedCount < maxMissed) {
      timerTextColor = 'text-yellow-400';
    } else {
      timerTextColor = 'text-red-500';
    }
  } else {
    // ═════════════════════════════════════════════════════════════════════════
    // JUST SHOW UP LOGIC — Traditional Strict-Time Countdown Limits
    // ═════════════════════════════════════════════════════════════════════════
    if (graceMinutes > 0) {
      if (now <= graceEnd) {
        timerLabel = 'Grace Ends-in';
        timerValue = formatCountdown(graceEnd - now);
        timerTextColor = 'text-yellow-400';
      } else {
        timerLabel = 'Status';
        timerValue = 'Expired';
        timerTextColor = 'text-red-500';
      }
    } else {
      timerLabel = 'Expires-in';
      timerValue = formatCountdown(end - now);
      timerTextColor = 'text-green-500';
    }
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
      {/* ── Secondary Metadata ──────────────────────────────────────────────────
           Note: Behavioral metadata (Alarms, Verify Style, Grace) is handled 
           by the ConfigSection at the modal level to prevent vertical bloat 
           in the live timer area. Only 'Strict Until' remains as it is 
           temporally reactive. 
           ────────────────────────────────────────────────────────────────── */}

      {/* Strict Mode Lock State */}
      {strictUntil && strictUntil > Date.now() && (
        <UView className="flex-row items-center justify-between mt-6">
          <UView className="flex-row items-center flex-1">
            <MaterialCommunityIcons
              name="lock-outline"
              size={24}
              color="#9CA3AF"
              style={{ marginRight: 16 }}
            />
            <BodyText className="text-gray-300 text-base">Strict Until</BodyText>
          </UView>
          <Animated.View style={{ opacity: opacityAnim }}>
            <BodyText className="text-white text-base">
              {dayjs(strictUntil).format('D MMM, h:mm a')}
            </BodyText>
          </Animated.View>
        </UView>
      )}

    </UView>
  );
}
