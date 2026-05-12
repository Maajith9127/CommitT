/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  EventDetailHeader — Title, Description & Status Badge                       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Renders the top section of the EventDetailModal:                            ║
 * ║  • Close (×) button                                                          ║
 * ║  • Event title + description                                                 ║
 * ║  • Status badge pill (e.g., "PENDING", "VERIFIED")                           ║
 * ║                                                                              ║
 * ║  This is a PURE presentational component — no hooks, no state.               ║ 
 * ║  All data comes in via props from EventDetailModal.                          ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Pressable } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthHeading, BodyText } from '@/components/ui/text';
import { THEME } from '@/constants/theme';

// ── Uniwind-wrapped primitives ──────────────────────────────────────────────
const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);

// ── Types ───────────────────────────────────────────────────────────────────

export interface EventDetailHeaderProps {
  /** Event title (task name) */
  title: string;
  /** Event description (task description) */
  description: string;
  /** Instance status: "pending", "verified", "failed", etc. */
  status?: string;
  /** Callback when the close (×) button is tapped */
  onClose: () => void;
  /** Callback when the three-dot options menu is tapped with anchor position */
  onMoreOptions?: (pos: { x: number; y: number }) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function EventDetailHeader({
  title,
  description,
  status,
  onClose,
  onMoreOptions,
}: EventDetailHeaderProps) {
  let borderColor: string | undefined = undefined;
  let bgColor: string | undefined = undefined;
  let textColor = 'white';
  let displayString = status?.replace('_', ' ');

  if (status === 'proceeded' || status === 'waived') {
    borderColor = `${THEME.colors.success}66`; // 40% alpha
    bgColor = `${THEME.colors.success}1A`; // 10% alpha
    textColor = THEME.colors.success;
    if (status === 'waived') displayString = 'waived off';
  } else if (status === 'failed' || status === 'penalized') {
    borderColor = `${THEME.colors.danger}66`;
    bgColor = `${THEME.colors.danger}1A`;
    textColor = THEME.colors.danger;
  } else if (status === 'waiver_active') {
    borderColor = 'rgba(255, 159, 10, 0.4)';
    bgColor = 'rgba(255, 159, 10, 0.1)';
    textColor = '#FF9F0A';
  }

  return (
    <>
      {/* ── Top Row Actions (Close & More) ── */}
      <UView className="flex-row justify-between items-center px-4 py-4 pt-6">
        <UPressable onPress={onClose} hitSlop={10}>
          <MaterialCommunityIcons name="close" size={24} color={THEME.colors.textMain} />
        </UPressable>

        <UPressable 
          onPress={() => {
            if (onMoreOptions) {
               // Capture approximate position for anchoring (standard modal padding + button offset)
               onMoreOptions({ x: 0, y: 60 }); 
            }
          }} 
          hitSlop={10}
        >
          <MaterialCommunityIcons name="dots-vertical" size={24} color={THEME.colors.textMain} />
        </UPressable>
      </UView>

      {/* ── Title + Description + Status Badge ── */}
      <UView className="px-6 flex-row justify-between items-start mt-2">
        <UView className="flex-1 mr-4">
          <AuthHeading className="text-left text-3xl">
            {title || "No Title"}
          </AuthHeading>
          <BodyText className="text-left text-gray-400">
            {description || "No description provided"}
          </BodyText>
        </UView>

        {status && (
          <UView 
            className="px-3 py-1 rounded-full border border-white/20 bg-white/5"
            style={{
              borderColor: borderColor,
              backgroundColor: bgColor,
            }}
          >
            <BodyText 
              className="text-xs font-bold uppercase"
              style={{ color: textColor }}
            >
              {displayString}
            </BodyText>
          </UView>
        )}
      </UView>
    </>
  );
}
