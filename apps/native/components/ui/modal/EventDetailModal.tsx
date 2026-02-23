import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, Pressable, Text, ScrollView } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/ui/button';
import { AuthHeading, BodyText } from '@/components/ui/text';
import dayjs from 'dayjs';
import { useMutation } from 'convex/react';
import { api } from '@commit/backend/convex/_generated/api';

import { LocationSection } from './EventDetailLocation';
import { PenaltySection, WaiverSection } from './EventDetailConditions';
import { useVerificationEngine } from '@/hooks/commits/useVerificationEngine';
import { useCalendarStore, CalendarEvent } from '@/stores/useCalendarStore';
import { useVerificationStore } from '@/stores/useVerificationStore';

const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);
const UText = withUniwind(Text);
const UScroll = withUniwind(ScrollView);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

interface EventDetailModalProps {
  visible: boolean;
  /** Function to set `selectedEvent` to null in the global Zustand store */
  onClose: () => void;
  /** The raw database ID of the selected Task instance */
  eventId: string | null;
}

/**
 * EventDetailModal (Global Singleton Pattern)
 * 
 * This UI component renders the rich details of a selected calendar event or task commit.
 * 
 * **CRITICAL ARCHITECTURE NOTE:**
 * Do NOT mount this modal inside individual screens (like schedules.tsx or commits.tsx).
 * It is hoisted to the root `_layout.tsx` to prevent React Navigation from double-mounting it
 * across background tabs, ensuring zero-lag instantiation and perfectly flat 60fps performance.
 */
export function EventDetailModal({ visible, onClose, eventId }: EventDetailModalProps) {
  const [cachedEventId, setCachedEventId] = useState<string | null>(eventId);

  // Cache the event ID so that when closing (eventId becomes null),
  // we still subscribe to the last ID, preventing the UI from vanishing instantly.
  useEffect(() => {
    if (eventId) {
      setCachedEventId(eventId);
    }
  }, [eventId]);

  const verifyMutation = useMutation(api.api.commitments.verify.default);
  const targetId = eventId || cachedEventId;

  const eventsList = useCalendarStore((state) => state.events);
  const upcomingEvent = useVerificationStore((state) => state.upcomingEvent);
  
  // Pluck the exact event from the live calendar store!
  // If not in the calendar's current month, check if it's the live upcoming Verification event.
  let currentEvent = eventsList.find((e: CalendarEvent) => e.id === targetId)?.originalData;
  
  if (!currentEvent && upcomingEvent?._id === targetId) {
    currentEvent = upcomingEvent;
  }

  const { isGathering, gatherEvidence } = useVerificationEngine(currentEvent);

  if (!currentEvent) return null;

  const handleVerifyPress = async () => {
    if (!currentEvent?._id) {
        console.error("No valid instance_id found on the event.");
        return;
    }
    try {
        // 1. Fire the engine and wait for native device sensors / camera to do their job
        const evidencePayload = await gatherEvidence();
        
        // 2. Transmit to Convex Backend
        const result = await verifyMutation({
            instanceId: currentEvent._id,
            evidence: evidencePayload, // The backend gets the verified native payload!
        });
        
        console.log("Verify Answer:", result);
        onClose();
    } catch (error: any) {
        console.error("Verify Failed:", error);
        alert(error.message || "Verification API Failed");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <UView className="bg-[#1A1A1A] w-full h-[95%] absolute bottom-0 rounded-t-3xl overflow-hidden">
          
          {/* Header with Close and Save/Verify placeholders based on reference style */}
          <UView className="flex-row justify-between items-center px-4 py-4 pt-6">
            <UPressable onPress={onClose} hitSlop={10} disabled={isGathering}>
              <MaterialCommunityIcons name="close" size={24} color={isGathering ? "#555" : "white"} />
            </UPressable>
            
            <PrimaryButton 
                className="w-auto px-4 py-1.5 h-auto rounded-md min-w-[70px]" 
                textClassName="text-sm font-bold"
                onPress={handleVerifyPress} 
                disabled={isGathering}
            >
                {isGathering ? "Checking..." : "Verify"}
            </PrimaryButton>
          </UView>

          {/* Empty Body as requested ("plain popup , dotn add anytjin g in there") */}
          <UScroll 
            className="flex-1 bg-[#1A1A1A] " 
            contentContainerStyle={{ paddingBottom: 0 }}
            showsVerticalScrollIndicator={false}
          >
            <UView className="px-6 flex-row justify-between items-start mt-2">
                <UView className="flex-1 mr-4">
                    <AuthHeading className="text-left text-3xl">
                        {currentEvent.title || "No Title"}
                    </AuthHeading>
                    <BodyText className="text-left text-gray-400 ">
                        {currentEvent.description || "No description provided"}
                    </BodyText>
                </UView>
                
                {/* Status Badge */}
                {currentEvent.status && (
                    <UView className={`px-3 py-1 rounded-full border ${
                        currentEvent.status === 'verified' ? 'bg-green-500/10 border-green-500/20' :
                        currentEvent.status === 'failed' ? 'bg-red-500/10 border-red-500/20' :
                        'bg-yellow-500/10 border-yellow-500/20'
                    }`}>
                        <BodyText className={`text-xs font-bold uppercase ${
                            currentEvent.status === 'verified' ? 'text-green-400' :
                            currentEvent.status === 'failed' ? 'text-red-400' :
                            'text-yellow-400'
                        }`}>
                            {currentEvent.status}
                        </BodyText>
                    </UView>
                )}
            </UView>
            {/* Time Section Container */}
            <UView className="border-t border-b border-white/20 mt-6 py-6 px-6">
                
                {/* 1. All Day Row */}
                <UView className="flex-row items-center mb-6">
                    <MaterialCommunityIcons name="clock-time-four-outline" size={24} color="#9CA3AF" style={{ marginRight: 16 }} />
                    <BodyText className="text-white text-lg flex-1">All-day</BodyText>
                    <UView className="w-10 h-6 bg-gray-600 rounded-full justify-center px-1">
                        <UView className="w-4 h-4 bg-gray-400 rounded-full" />
                    </UView>
                </UView>

                {/* 2. Start Time Row */}
                <UView className="flex-row justify-between mb-4 pl-10">
                    <BodyText className="text-white text-base">{dayjs(currentEvent.start).format('ddd, D MMM YYYY')}</BodyText>
                    <BodyText className="text-white text-base">{dayjs(currentEvent.start).format('h:mm a')}</BodyText>
                </UView>

                {/* 3. End Time Row */}
                <UView className="flex-row justify-between mb-6 pl-10">
                    <BodyText className="text-white text-base">{dayjs(currentEvent.end).format('ddd, D MMM YYYY')}</BodyText>
                    <BodyText className="text-white text-base">{dayjs(currentEvent.end).format('h:mm a')}</BodyText>
                </UView>

                {/* 4. Timezone Row */}
                <UView className="flex-row items-center">
                    <MaterialCommunityIcons name="earth" size={24} color="#9CA3AF" style={{ marginRight: 16 }} />
                    <BodyText className="text-gray-300 text-base">India Standard Time</BodyText>
                </UView>

            </UView>

            {/* --- GPS Location Display --- */}
            {/* 
                Calculates geo-fencing requirements ("within" or "outside" the radius)
                and securely renders a native Google Map component (Android only) 
                without web-view overhead.
            */}
            <LocationSection event={currentEvent} />
            
            {/* Penalty Section */}
            <PenaltySection event={currentEvent} />

            {/* Waiver Section */}
            <WaiverSection event={currentEvent} />
          </UScroll>

        </UView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
});
