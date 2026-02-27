/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  EventDetailHeader — Title, Description & Status Badge                      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                             ║
 * ║  Renders the top section of the EventDetailModal:                           ║
 * ║  • Close (×) button                                                         ║
 * ║  • Event title + description                                                ║
 * ║  • Status badge pill (e.g., "PENDING", "VERIFIED")                          ║
 * ║                                                                             ║
 * ║  This is a PURE presentational component — no hooks, no state.              ║
 * ║  All data comes in via props from EventDetailModal.                          ║
 * ║                                                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';
import { View, Pressable } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthHeading, BodyText } from '@/components/ui/text';

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
}

// ── Component ───────────────────────────────────────────────────────────────

export function EventDetailHeader({
  title,
  description,
  status,
  onClose,
}: EventDetailHeaderProps) {
  return (
    <>
      {/* ── Close Button ── */}
      <UView className="flex-row justify-between items-center px-4 py-4 pt-6">
        <UPressable onPress={onClose} hitSlop={10}>
          <MaterialCommunityIcons name="close" size={24} color="white" />
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
              borderColor: status === 'proceeded' ? 'rgba(76, 217, 100, 0.4)' : status === 'failed' ? 'rgba(255, 59, 48, 0.4)' : undefined,
              backgroundColor: status === 'proceeded' ? 'rgba(76, 217, 100, 0.1)' : status === 'failed' ? 'rgba(255, 59, 48, 0.1)' : undefined,
            }}
          >
            <BodyText 
              className="text-xs font-bold uppercase"
              style={{
                color: status === 'proceeded' ? '#4CD964' : status === 'failed' ? '#FF3B30' : 'white',
              }}
            >
              {status}
            </BodyText>
          </UView>
        )}
      </UView>
    </>
  );
}
