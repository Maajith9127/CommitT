/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  EventDetailModal — Global Singleton Event Viewer                          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                            ║
 * ║  PURPOSE:                                                                  ║
 * ║  Full-screen bottom sheet that displays the details of a selected           ║
 * ║  calendar event / task instance. Includes title, description, status,       ║
 * ║  time window, map (GPS location), penalty, waiver, and a "Verify" action.  ║
 * ║                                                                            ║
 * ║  HOW DATA FLOWS:                                                           ║
 * ║  1. User taps an event on any screen (calendar, commits, verification).    ║
 * ║  2. That screen calls:                                                     ║
 * ║       setSelectedEventId(instanceId, fullEventObject)                      ║
 * ║     This writes BOTH the ID and the full event data into Zustand.          ║
 * ║  3. This modal reads `selectedEventId` + `selectedEvent` from Zustand.     ║
 * ║     When the ID is non-null, <Modal visible={true}> slides up.             ║
 * ║  4. On close, setSelectedEventId(null) hides the modal.                    ║
 * ║                                                                            ║
 * ║  SINGLETON GUARD (Why?):                                                   ║
 * ║  Expo Router can mount (main)/_layout.tsx TWICE during Stack transitions    ║
 * ║  (e.g. navigating to (create-commit)/final and back). Without protection,  ║
 * ║  two <Modal> instances appear, causing a "double page" visual bug on       ║
 * ║  dismiss. The module-level `isInstanceMounted` flag ensures only the        ║
 * ║  FIRST instance renders; any duplicate returns null.                        ║
 * ║                                                                            ║
 * ║  USAGE (in (main)/_layout.tsx):                                            ║
 * ║    <EventDetailModal />    ← zero props, fully self-contained              ║
 * ║                                                                            ║
 * ║  KEY RULES:                                                                ║
 * ║  • Never pass props — all data comes from Zustand.                         ║
 * ║  • Never mount this in individual screens — only in the layout.            ║
 * ║  • All hooks are called unconditionally (above the singleton guard)        ║
 * ║    to comply with React's Rules of Hooks.                                  ║
 * ║                                                                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AuthHeading, BodyText } from '@/components/ui/text';
import dayjs from 'dayjs';
import { useMutation } from 'convex/react';
import { api } from '@commit/backend/convex/_generated/api';

import { LocationSection } from './EventDetailLocation';
import { PenaltySection, WaiverSection } from './EventDetailConditions';

import { useCalendarStore } from '@/stores/useCalendarStore';
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';

// ── Uniwind-wrapped primitives ──
const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);
const UScroll = withUniwind(ScrollView);

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON GUARD
//
// Module-level flag (lives outside React). Only ONE instance of this component
// is allowed to render the <Modal> at any time. Duplicate instances that Expo
// Router may create during Stack transitions will see this flag as `true` and
// bail out by returning null from their render.
// ─────────────────────────────────────────────────────────────────────────────
let isInstanceMounted = false;

export const EventDetailModal = React.memo(function EventDetailModal() {

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SINGLETON OWNERSHIP
  //    The first instance to mount claims the lock. If a second instance
  //    appears (Expo Router double-mount), it will NOT claim ownership
  //    and will return null below. On unmount, the owner releases the lock.
  // ═══════════════════════════════════════════════════════════════════════════

  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!isInstanceMounted) {
      isInstanceMounted = true;
      setIsOwner(true);
    }
    return () => {
      if (isInstanceMounted) {
        isInstanceMounted = false;
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ZUSTAND STATE (called unconditionally — Rules of Hooks)
  //    Even the duplicate instance calls these hooks. This is required
  //    because React enforces that the same hooks run on every render.
  //    The duplicate simply won't USE the values (it returns null).
  // ═══════════════════════════════════════════════════════════════════════════

  /** The Convex document `_id` of the currently selected task instance */
  const eventId = useCalendarStore((state) => state.selectedEventId);

  /** The full event object (title, start, end, status, conditions, etc.) */
  const currentEvent = useCalendarStore((state) => state.selectedEvent);

  /** Setter: pass `null` to close, or `(id, eventData)` to open */
  const setSelectedEventId = useCalendarStore((state) => state.setSelectedEventId);

  /** Derived: modal is visible when we have an eventId */
  const isVisible = !!eventId;

  /** Controls parent scroll — disabled while user pans the embedded map */
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. VERIFICATION ENGINE
  //    Handles GPS evidence gathering, camera capture, and transmitting
  //    proof to the Convex backend for on-chain / backend verification.
  // ═══════════════════════════════════════════════════════════════════════════

  const verifyMutation = useMutation(api.api.commitments.verify.default);

  /** Track which metric is being verified right now (for spinner) */
  const [verifyingMetric, setVerifyingMetric] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Close the modal by resetting the Zustand selection to null */
  const handleClose = useCallback(() => {
    setSelectedEventId(null);
  }, [setSelectedEventId]);

  // ─── SINGLETON GUARD: Duplicate → render nothing ──────────────────────────
  if (!isOwner) return null;

  // ─── NO DATA: Keep modal shell alive but hidden ───────────────────────────
  if (!currentEvent) {
    return (
      <Modal visible={false} transparent animationType="slide" onRequestClose={handleClose}>
        <View />
      </Modal>
    );
  }

  /**
   * Per-condition verification handler.
   * Calls the backend with the instanceId + metricKey.
   * The backend validates, persists the result to DB, and
   * Convex reactivity pushes the update to currentEvent automatically.
   */
  const handleVerifyCondition = async (metricKey: string) => {
    if (!currentEvent?._id || verifyingMetric) return;

    setVerifyingMetric(metricKey);
    try {
      const result = await verifyMutation({
        instanceId: currentEvent._id as any,
        metricKey,
      });
      console.log(`[EventDetailModal] ${metricKey} verification:`, result);
      // No need to store locally — Convex reactivity updates currentEvent from DB
    } catch (error: any) {
      console.error(`[EventDetailModal] ${metricKey} verification failed:`, error);
    } finally {
      setVerifyingMetric(null);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <UView className="bg-[#1A1A1A] w-full h-[95%] absolute bottom-0 rounded-t-3xl overflow-hidden">
          
          {/* ── Header: Close (×) ── */}
          <UView className="flex-row justify-between items-center px-4 py-4 pt-6">
            <UPressable onPress={handleClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color="white" />
            </UPressable>
          </UView>

          {/* ── Scrollable Content ── */}
          <UScroll 
            className="flex-1 bg-[#1A1A1A]" 
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            scrollEnabled={scrollEnabled}
          >

            {/* ── Title + Description + Status Badge ── */}
            <UView className="px-6 flex-row justify-between items-start mt-2">
                <UView className="flex-1 mr-4">
                    <AuthHeading className="text-left text-3xl">
                        {currentEvent.title || "No Title"}
                    </AuthHeading>
                    <BodyText className="text-left text-gray-400">
                        {currentEvent.description || "No description provided"}
                    </BodyText>
                </UView>
                
                {currentEvent.status && (
                    <UView className="px-3 py-1 rounded-full border bg-white/5 border-white/20">
                        <BodyText className="text-xs font-bold uppercase text-white">
                            {currentEvent.status}
                        </BodyText>
                    </UView>
                )}
            </UView>

            {/* ── Time Section: All-day toggle, Start, End, Timezone ── */}
            <UView className="border-t border-b border-white/20 mt-6 py-6 px-6">
                
                {/* All Day Row */}
                <UView className="flex-row items-center mb-6">
                    <MaterialCommunityIcons name="clock-time-four-outline" size={28} color="#9CA3AF" style={{ marginRight: 16 }} />
                    <UView className="flex-1 mr-4 overflow-hidden">
                        <BodyText className="text-white text-base">All-day</BodyText>
                    </UView>
                    <VerificationStatusCircle 
                      status={(currentEvent as any).time_status ?? 'neutral'}
                      onPress={() => handleVerifyCondition('time')}
                      isLoading={verifyingMetric === 'time'}
                    />
                </UView>

                {/* Start Time */}
                <UView className="flex-row justify-between mb-4 pl-10">
                    <BodyText className="text-white text-base">{dayjs(currentEvent.start).format('ddd, D MMM YYYY')}</BodyText>
                    <BodyText className="text-white text-base">{dayjs(currentEvent.start).format('h:mm a')}</BodyText>
                </UView>

                {/* End Time */}
                <UView className="flex-row justify-between mb-6 pl-10">
                    <BodyText className="text-white text-base">{dayjs(currentEvent.end).format('ddd, D MMM YYYY')}</BodyText>
                    <BodyText className="text-white text-base">{dayjs(currentEvent.end).format('h:mm a')}</BodyText>
                </UView>

                {/* Timezone */}
                <UView className="flex-row items-center">
                    <MaterialCommunityIcons name="earth" size={24} color="#9CA3AF" style={{ marginRight: 16 }} />
                    <BodyText className="text-gray-300 text-base">India Standard Time</BodyText>
                </UView>

            </UView>

            {/* ── GPS Location (renders a native Google Map if conditions exist) ── */}
            <LocationSection 
              event={currentEvent} 
              onMapTouchStart={() => setScrollEnabled(false)}
              onMapTouchEnd={() => setScrollEnabled(true)}
            />
            
            {/* ── Financial Penalty details ── */}
            <PenaltySection event={currentEvent} />

            {/* ── Waiver / grace period details ── */}
            <WaiverSection event={currentEvent} />

          </UScroll>

        </UView>
      </View>
    </Modal>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
});
