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
import Svg, { Circle } from 'react-native-svg';
import { THEME } from '@/constants/theme';

// ── Uniwind-wrapped primitives ──────────────────────────────────────────────
const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);

// ── Types ───────────────────────────────────────────────────────────────────

/** All possible verification statuses (mirrors conditionStatusEnum in schema) */
type StatusType = 'neutral' | 'verified' | 'failed' | 'applied' | 'waived' | 'percentage' | 'dots';

export interface VerificationCircleProps {
  /** Current verification status of this condition */
  status?: StatusType;
  /** Progress percentage (0–100) */
  percentage?: number;
  /** Numeric ratio (e.g., 3/7 for captchas) */
  ratio?: { current: number; total: number };
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
  ratio,
  onPress,
  isLoading = false,
  thumbnailUrl,
}: VerificationCircleProps) {

  // Shared styling for the outer circle container
  const baseOuterClass = "w-12 h-12 rounded-full justify-center items-center overflow-hidden";
  const baseOuterStyle = { borderWidth: 1.5, borderColor: THEME.colors.surfaceElevated, backgroundColor: THEME.colors.surfaceLight };
  const iconColor = THEME.colors.textMuted;

  // ── 📊 Progress Ring logic: If we have a ratio or percentage, we draw the SVG ring
  const effectivePercentage = ratio ? (ratio.current / ratio.total) * 100 : percentage;
  const showRing = ratio || (status === 'percentage' && percentage > 0);

  // SVG Constants
  const size = 48;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (effectivePercentage / 100) * circumference;

  const renderRing = () => (
    <View style={{ position: 'absolute' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Active progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ratio ? THEME.colors.primary : iconColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </Svg>
    </View>
  );

  // ── 🖼️ Thumbnail Profile: If an image exists, it takes precedence
  if (thumbnailUrl && !isLoading) {
    const content = (
      <>
        <Image 
          source={{ uri: thumbnailUrl }} 
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
        {showRing && renderRing()}
      </>
    );

    if (onPress) {
      return (
        <UPressable className={baseOuterClass} style={baseOuterStyle} onPress={onPress}>
          {content}
        </UPressable>
      );
    }
    return <UView className={baseOuterClass} style={baseOuterStyle}>{content}</UView>;
  }

  // ── Loading state
  if (isLoading) {
    return (
      <UView className={baseOuterClass} style={baseOuterStyle}>
        <ActivityIndicator size="small" color={iconColor} />
      </UView>
    );
  }

  // ── Ratio Display: Premium "3/10" look
  if (ratio) {
    const content = (
      <View className="items-center justify-center">
        {renderRing()}
        <View className="flex-row items-baseline">
          <BodyText className="font-bold" style={{ fontSize: 13, color: THEME.colors.textMain }}>{ratio.current}</BodyText>
          <BodyText style={{ fontSize: 9, color: THEME.colors.textMuted }}>/{ratio.total}</BodyText>
        </View>
      </View>
    );
    if (onPress) {
      return <UPressable className={baseOuterClass} style={baseOuterStyle} onPress={onPress}>{content}</UPressable>;
    }
    return <UView className={baseOuterClass} style={baseOuterStyle}>{content}</UView>;
  }

  // ── Verified state
  if (status === 'verified') {
    const verifiedContent = (
      <UView className="w-12 h-12 rounded-full border justify-center items-center" style={{ borderColor: THEME.colors.success, backgroundColor: 'rgba(76, 217, 100, 0.1)' }}>
        <MaterialCommunityIcons name="check" size={24} color={THEME.colors.success} />
      </UView>
    );

    if (onPress) {
      return (
        <UPressable onPress={onPress}>
          {verifiedContent}
        </UPressable>
      );
    }
    return verifiedContent;
  }

  // ── Failed state
  if (status === 'failed') {
    if (onPress) {
      return (
        <UPressable className="w-12 h-12 rounded-full border justify-center items-center" style={{ borderColor: THEME.colors.danger, backgroundColor: 'rgba(255, 59, 48, 0.1)' }} onPress={onPress}>
          <MaterialCommunityIcons name="refresh" size={24} color={THEME.colors.danger} />
        </UPressable>
      );
    }
    return (
      <UView className="w-12 h-12 rounded-full border justify-center items-center" style={{ borderColor: THEME.colors.danger, backgroundColor: 'rgba(255, 59, 48, 0.1)' }}>
        <MaterialCommunityIcons name="close" size={24} color={THEME.colors.danger} />
      </UView>
    );
  }

  // ── Dots state (Management/More state) ──
  if (status === 'dots') {
    const dotsContent = (
      <UView 
        className={baseOuterClass} 
        style={[baseOuterStyle, { borderColor: THEME.colors.surfaceLight }]}
      >
        <MaterialCommunityIcons name="dots-vertical" size={24} color={iconColor} />
      </UView>
    );
    if (onPress) {
      return <UPressable onPress={onPress}>{dotsContent}</UPressable>;
    }
    return dotsContent;
  }

  // ── Applied / Waived states
  if (status === 'applied') {
    return (
      <UView className={baseOuterClass} style={baseOuterStyle}>
        <MaterialCommunityIcons name="flag-checkered" size={24} color={iconColor} />
      </UView>
    );
  }

  if (status === 'waived') {
    return (
      <UView className={baseOuterClass} style={baseOuterStyle}>
        <MaterialCommunityIcons name="shield-check-outline" size={24} color={iconColor} />
      </UView>
    );
  }

  // ── Percentage state
  if (status === 'percentage') {
    return (
      <UView className={baseOuterClass} style={baseOuterStyle}>
        {renderRing()}
        <MaterialCommunityIcons name="percent" size={16} color={iconColor} />
      </UView>
    );
  }

  // ── Neutral state
  const neutralIcon = <MaterialCommunityIcons name="cursor-pointer" size={24} color={iconColor} />;
  if (onPress) {
    return <UPressable className={baseOuterClass} style={baseOuterStyle} onPress={onPress}>{neutralIcon}</UPressable>;
  }
  return <UView className={baseOuterClass} style={baseOuterStyle}>{neutralIcon}</UView>;
}
