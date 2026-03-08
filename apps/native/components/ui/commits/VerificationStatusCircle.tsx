/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  VerificationStatusCircle — Per-Condition Status Indicator                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                             ║
 * ║  A small circular badge that shows the verification status of a single      ║
 * ║  condition (time, location, photo, etc.). Used in EventDetailModal next     ║
 * ║  to each condition row.                                                     ║
 * ║                                                                             ║
 * ║  VISUAL STATES:                                                             ║
 * ║  ┌────────────┬───────────────────────────────────────────────────────┐     ║
 * ║  │ Status     │ What the user sees                                   │     ║
 * ║  ├────────────┼───────────────────────────────────────────────────────┤     ║
 * ║  │ isLoading  │ Spinner (ActivityIndicator) — request in flight      │     ║
 * ║  │ verified   │ ✓ Check mark — condition passed (final, not tappable)│     ║
 * ║  │ failed     │ ↻ Refresh icon (tappable for retry) or ✕ (static)   │     ║
 * ║  │ applied    │ 🏁 Flag — system auto-applied                        │     ║
 * ║  │ waived     │ 🛡 Shield — user completed a waiver bypass           │     ║
 * ║  │ percentage │ % — partial progress                                 │     ║
 * ║  │ neutral    │ 👆 Pointer icon (tappable to start verification)     │     ║
 * ║  └────────────┴───────────────────────────────────────────────────────┘     ║
 * ║                                                                             ║
 * ║  INTERACTIVE BEHAVIOR:                                                      ║
 * ║  • `onPress` makes "neutral" and "failed" states tappable (Pressable).     ║
 * ║  • "failed" + onPress shows a "refresh" icon (retry affordance).           ║
 * ║  • "verified" is NEVER tappable — success is final.                        ║
 * ║                                                                             ║
 * ║  USAGE:                                                                     ║
 * ║    <VerificationStatusCircle                                                ║
 * ║      status="neutral"                                                       ║
 * ║      onPress={() => handleVerify('time')}                                   ║
 * ║      isLoading={verifyingMetric === 'time'}                                 ║
 * ║    />                                                                       ║
 * ║                                                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Pressable, ActivityIndicator, Image } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BodyText } from '@/components/ui/text';

// ── Uniwind-wrapped primitives ──────────────────────────────────────────────
const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);

// ── Types ───────────────────────────────────────────────────────────────────

/** All possible verification statuses (mirrors conditionStatusEnum in schema) */
type StatusType = 'neutral' | 'verified' | 'failed' | 'applied' | 'waived' | 'percentage';

export interface VerificationCircleProps {
  /** Current verification status of this condition */
  status?: StatusType;
  /** Progress percentage (0–100), only used when status is 'percentage' */
  percentage?: number;
  /** Tap handler — makes 'neutral' and 'failed' states interactive */
  onPress?: () => void;
  /** When true, shows a spinner instead of the status icon */
  isLoading?: boolean;
  /** Optional image URL to display as a thumbnail within the circle */
  thumbnailUrl?: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export function VerificationStatusCircle({
  status = 'neutral',
  percentage = 0,
  onPress,
  isLoading = false,
  thumbnailUrl,
}: VerificationCircleProps) {

  // Shared styling for the outer circle container
  const baseOuterClass = "w-12 h-12 rounded-full border border-white/40 justify-center items-center bg-white/5 overflow-hidden";
  const iconColor = "#D1D5DB"; // Tailwind gray-300

  // ── 🖼️ Thumbnail Profile: If an image exists, it takes precedence (premium look)
  if (thumbnailUrl && !isLoading) {
    const content = (
      <Image 
        source={{ uri: thumbnailUrl }} 
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
    );

    if (onPress) {
      return (
        <UPressable className={baseOuterClass} onPress={onPress}>
          {content}
        </UPressable>
      );
    }
    return <UView className={baseOuterClass}>{content}</UView>;
  }

  // ── Loading: Show spinner while the backend is processing ─────────────
  if (isLoading) {
    return (
      <UView className={baseOuterClass}>
        <ActivityIndicator size="small" color={iconColor} />
      </UView>
    );
  }

  // ── Verified: Green check mark (final — never tappable) ────────────────
  // Uses app success color: #4CD964
  if (status === 'verified') {
    return (
      <UView className="w-12 h-12 rounded-full border justify-center items-center" style={{ borderColor: '#4CD964', backgroundColor: 'rgba(76, 217, 100, 0.1)' }}>
        <MaterialCommunityIcons name="check" size={24} color="#4CD964" />
      </UView>
    );
  }

  // ── Failed: Red retry/close icon ──────────────────────────────────────
  // Uses app danger color: #FF3B30
  if (status === 'failed') {
    if (onPress) {
      // Show red refresh icon — tapping retries the verification
      return (
        <UPressable className="w-12 h-12 rounded-full border justify-center items-center" style={{ borderColor: '#FF3B30', backgroundColor: 'rgba(255, 59, 48, 0.1)' }} onPress={onPress}>
          <MaterialCommunityIcons name="refresh" size={24} color="#FF3B30" />
        </UPressable>
      );
    }
    // No handler — display-only failure
    return (
      <UView className="w-12 h-12 rounded-full border justify-center items-center" style={{ borderColor: '#FF3B30', backgroundColor: 'rgba(255, 59, 48, 0.1)' }}>
        <MaterialCommunityIcons name="close" size={24} color="#FF3B30" />
      </UView>
    );
  }

  // ── Applied: System auto-verified this condition ─────────────────────
  if (status === 'applied') {
    return (
      <UView className={baseOuterClass}>
        <MaterialCommunityIcons name="flag-checkered" size={24} color={iconColor} />
      </UView>
    );
  }

  // ── Waived: User bypassed via a waiver task ──────────────────────────
  if (status === 'waived') {
    return (
      <UView className={baseOuterClass}>
        <MaterialCommunityIcons name="shield-check-outline" size={24} color={iconColor} />
      </UView>
    );
  }

  // ── Percentage: Partial progress indicator ───────────────────────────
  if (status === 'percentage') {
    return (
      <UView className={baseOuterClass}>
        <MaterialCommunityIcons name="percent" size={24} color={iconColor} />
      </UView>
    );
  }

  // ── Neutral (default): Tappable pointer if onPress provided ──────────
  if (onPress) {
    return (
      <UPressable className={baseOuterClass} onPress={onPress}>
        <MaterialCommunityIcons name="cursor-pointer" size={24} color={iconColor} />
      </UPressable>
    );
  }

  // Neutral without handler — static display
  return (
    <UView className={baseOuterClass}>
      <MaterialCommunityIcons name="cursor-pointer" size={24} color={iconColor} />
    </UView>
  );
}
