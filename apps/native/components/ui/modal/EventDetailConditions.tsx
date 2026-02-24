import React from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BodyText } from '@/components/ui/text';

const UView = withUniwind(View);

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DOMAIN MAPS (MOCK DATA / UI CONFIG)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps penalty keys from the backend database to their respective UI representations.
 * Used to dynamically render the correct icon, title, and description.
 */
export const PENALTY_MAP: Record<string, { icon: any; title: string; subtitle: string }> = {
  money: { icon: 'currency-inr', title: 'Money Penalty', subtitle: 'Lose a fixed amount when you miss' },
  photo: { icon: 'camera-enhance-outline', title: 'Embarrassing Photo', subtitle: 'Send a cringe picture to someone' },
  message: { icon: 'message-alert-outline', title: 'Cringe Message', subtitle: 'A shameful message gets sent to a contact' },
  blockapp: { icon: 'cellphone-off', title: 'Block Favourite App', subtitle: 'Your chosen app gets blocked temporarily' },
};

/**
 * Maps waiver keys from the backend database to their respective UI representations.
 * Waivers are tasks the user can perform to bypass a penalty if they failed their main commitment.
 */
export const WAIVER_MAP: Record<string, { icon: any; title: string; subtitle: string }> = {
  captcha: { icon: 'shield-check-outline', title: 'Solve CAPTCHAs', subtitle: 'Solve a set number of CAPTCHAs' },
  paragraph: { icon: 'pencil-outline', title: 'Write a Long Paragraph', subtitle: 'Type a 3000-word paragraph' },
  intense: { icon: 'fire', title: 'Redo With More Intensity', subtitle: 'Repeat tomorrow with a harder version' },
  run: { icon: 'run-fast', title: 'Run 5 KM', subtitle: 'Choose a location and complete the run' },
};

// ─────────────────────────────────────────────────────────────────────────────
// MODULAR SUB-COMPONENTS
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';

/**
 * Generic blueprint for rendering a condition row (used by Penalty and Waiver sections)
 */
export const InfoSection = ({ icon, color, title, subtitle, status = 'neutral', percentage }: { icon: any; color: string; title: string; subtitle: string; status?: 'neutral' | 'verified' | 'failed' | 'partial'; percentage?: number }) => (
  <UView className="border-b border-white/20 flex-row p-6 items-center">
    <MaterialCommunityIcons name={icon} size={28} color={color} style={{ marginRight: 16 }} />
    <UView className="flex-1 mr-4">
      <BodyText className="text-white text-lg font-semibold" numberOfLines={1}>{title}</BodyText>
      <BodyText className="text-gray-400 text-sm mt-1" numberOfLines={1}>{subtitle}</BodyText>
    </UView>
    <VerificationStatusCircle status={status} percentage={percentage} />
  </UView>
);

/**
 * Parses the event's `conditions` array to find a penalty, mapping it to the UI.
 * Failsafe: Defaults to 'money' if no specific penalty is defined but a penalty rule exists.
 */
export const PenaltySection = ({ event }: { event: any }) => {
  const penaltyCondition = event?.conditions?.find((c: any) => PENALTY_MAP[c.metric_key] || c.type === 'penalty');
  
  const key = penaltyCondition?.metric_key || 'money';
  const info = PENALTY_MAP[key] || PENALTY_MAP['money'];

  return <InfoSection icon={info.icon} color="#FF3B30" title={info.title} subtitle={info.subtitle} status="verified" />;
};

/**
 * Parses the event's `conditions` array to find a waiver, mapping it to the UI.
 * Failsafe: Defaults to 'captcha' if no specific waiver is defined.
 */
export const WaiverSection = ({ event }: { event: any }) => {
  const waiverCondition = event?.conditions?.find((c: any) => WAIVER_MAP[c.metric_key] || c.type === 'waiver');

  const key = waiverCondition?.metric_key || 'captcha';
  const info = WAIVER_MAP[key] || WAIVER_MAP['captcha'];

  return <InfoSection icon={info.icon} color="#4CD964" title={info.title} subtitle={info.subtitle} status="verified" />;
};
