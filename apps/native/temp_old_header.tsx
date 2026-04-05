/**
 * ΓòöΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòù
 * Γòæ  EventDetailHeader ΓÇö Title, Description & Status Badge                       Γòæ
 * ΓòáΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòú
 * Γòæ                                                                              Γòæ
 * Γòæ  Renders the top section of the EventDetailModal:                            Γòæ
 * Γòæ  ΓÇó Close (├ù) button                                                          Γòæ
 * Γòæ  ΓÇó Event title + description                                                 Γòæ
 * Γòæ  ΓÇó Status badge pill (e.g., "PENDING", "VERIFIED")                           Γòæ
 * Γòæ                                                                              Γòæ
 * Γòæ  This is a PURE presentational component ΓÇö no hooks, no state.               Γòæ 
 * Γòæ  All data comes in via props from EventDetailModal.                          Γòæ
 * Γòæ                                                                              Γòæ
 * ΓòÜΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓò¥
 */

import React from 'react';
import { View, Pressable } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthHeading, BodyText } from '@/components/ui/text';

// ΓöÇΓöÇ Uniwind-wrapped primitives ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface EventDetailHeaderProps {
  /** Event title (task name) */
  title: string;
  /** Event description (task description) */
  description: string;
  /** Instance status: "pending", "verified", "failed", etc. */
  status?: string;
  /** Callback when the close (├ù) button is tapped */
  onClose: () => void;
  /** Callback when the three-dot options menu is tapped with anchor position */
  onMoreOptions?: (pos: { x: number; y: number }) => void;
}

// ΓöÇΓöÇ Component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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
    borderColor = 'rgba(76, 217, 100, 0.4)';
    bgColor = 'rgba(76, 217, 100, 0.1)';
    textColor = '#4CD964';
    if (status === 'waived') displayString = 'waived off';
  } else if (status === 'failed' || status === 'penalized') {
    borderColor = 'rgba(255, 59, 48, 0.4)';
    bgColor = 'rgba(255, 59, 48, 0.1)';
    textColor = '#FF3B30';
  } else if (status === 'waiver_active') {
    borderColor = 'rgba(255, 159, 10, 0.4)';
    bgColor = 'rgba(255, 159, 10, 0.1)';
    textColor = '#FF9F0A';
  }

  return (
    <>
      {/* ΓöÇΓöÇ Top Row Actions (Close & More) ΓöÇΓöÇ */}
      <UView className="flex-row justify-between items-center px-4 py-4 pt-6">
        <UPressable onPress={onClose} hitSlop={10}>
          <MaterialCommunityIcons name="close" size={24} color="white" />
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
          <MaterialCommunityIcons name="dots-vertical" size={24} color="white" />
        </UPressable>
      </UView>

      {/* ΓöÇΓöÇ Title + Description + Status Badge ΓöÇΓöÇ */}
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
