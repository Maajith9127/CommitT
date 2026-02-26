/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  EventDetailModal — Global Singleton Event Viewer                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                             ║
 * ║  PURPOSE:                                                                   ║
 * ║  Full-screen bottom sheet that displays the details of a selected           ║
 * ║  calendar event / task instance. Includes title, description, status,       ║
 * ║  time window, map (GPS location), penalty, waiver, and per-condition        ║
 * ║  verification circles.                                                      ║
 * ║                                                                             ║
 * ║  DATA FLOW:                                                                 ║
 * ║  ┌────────────────────────────────────────────────────────────────────┐     ║
 * ║  │ 1. User taps event on calendar / commits / verification screen     │     ║
 * ║  │ 2. Caller invokes: setSelectedEventId(instanceId, eventObject)     │     ║
 * ║  │ 3. Zustand stores both ID and data atomically                      │     ║
 * ║  │ 4. This modal reads them → <Modal visible={true}> slides up        │     ║
 * ║  │ 5. On close: setSelectedEventId(null) → modal hides                │     ║
 * ║  └────────────────────────────────────────────────────────────────────┘     ║
 * ║                                                                             ║
 * ║  VERIFICATION FLOW:                                                         ║
 * ║  ┌────────────────────────────────────────────────────────────────────┐     ║
 * ║  │ 1. User taps a VerificationStatusCircle (e.g., time row)           │     ║
 * ║  │ 2. handleVerifyCondition(metricKey) fires                          │     ║
 * ║  │ 3. Shows spinner on that circle (verifyingMetric state)            │     ║
 * ║  │ 4. Calls backend verify mutation → backend validates & persists    │     ║
 * ║  │ 5. On success: stores result in conditionStatuses local state      │     ║
 * ║  │ 6. Circle reads conditionStatuses[key] → shows ✓ or ↻             │     ║
 * ║  └────────────────────────────────────────────────────────────────────┘     ║
 * ║                                                                             ║
 * ║  WHY LOCAL STATE (not live Convex subscription)?                            ║
 * ║  A live useQuery subscription causes the entire modal (including the        ║
 * ║  embedded Google Map) to re-render on every DB update, making the map       ║
 * ║  reload infinitely. Instead, we use the mutation's RETURN VALUE to          ║
 * ║  update the circle instantly via local React state. The backend still       ║
 * ║  persists the result to the DB for permanent storage.                       ║
 * ║                                                                             ║
 * ║  SINGLETON GUARD:                                                           ║
 * ║  Expo Router can mount _layout.tsx TWICE during Stack transitions.          ║
 * ║  The module-level `isInstanceMounted` flag ensures only the FIRST           ║
 * ║  instance renders; duplicates return null.                                  ║
 * ║                                                                             ║
 * ║  KEY RULES:                                                                 ║
 * ║  • Never pass props — all data comes from Zustand.                          ║
 * ║  • Never mount this in individual screens — only in the layout.             ║
 * ║  • All hooks are called unconditionally (above the singleton guard)         ║
 * ║    to comply with React's Rules of Hooks.                                   ║
 * ║                                                                             ║
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

// ── Uniwind-wrapped primitives ──────────────────────────────────────────────
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

  /** The full event object snapshot (title, start, end, status, conditions, etc.) */
  const currentEvent = useCalendarStore((state) => state.selectedEvent);

  /** Setter: pass `null` to close, or `(id, eventData)` to open */
  const setSelectedEventId = useCalendarStore((state) => state.setSelectedEventId);

  /** Derived: modal is visible when we have an eventId */
  const isVisible = !!eventId;

  /** Controls parent scroll — disabled while user pans the embedded map */
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. VERIFICATION STATE
  //
  //    We use LOCAL React state (not a live Convex subscription) to track
  //    verification results because a live `useQuery` subscription causes
  //    the entire modal to re-render (including the Google Map), making the
  //    map reload infinitely. Instead:
  //
  //    • verifyingMetric   → Which circle is currently showing a spinner
  //    • conditionStatuses → The result for each metric after the mutation
  //                          returns (e.g., { time: "verified" })
  //
  //    The backend STILL persists the result to the DB. This local state
  //    is just for immediate UI feedback within the current modal session.
  // ═══════════════════════════════════════════════════════════════════════════

  const verifyMutation = useMutation(api.api.commitments.verify.default);

  /** Which metric_key is currently being verified (shows spinner on that circle) */
  const [verifyingMetric, setVerifyingMetric] = useState<string | null>(null);

  /** 
   * Per-condition verification results returned by the backend.
   * Key = metric_key (e.g., "time"), Value = status (e.g., "verified").
   * This is ephemeral — only lives while the modal is open.
   */
  const [conditionStatuses, setConditionStatuses] = useState<Record<string, string>>({});

  // ── Reset verification statuses when a DIFFERENT event is opened ───────
  // Seeds the initial state from the Zustand snapshot (which has time_status
  // from the DB), so previously-verified events correctly show the green tick
  // without needing to re-verify.
  useEffect(() => {
    if (eventId && currentEvent) {
      const initial: Record<string, string> = {};
      // Seed time_status from the DB snapshot (if it was verified before)
      if ((currentEvent as any).time_status) {
        initial['time'] = (currentEvent as any).time_status;
      }
      setConditionStatuses(initial);
    } else {
      setConditionStatuses({});
    }
  }, [eventId]); // Only runs when a NEW event is selected

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

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PER-CONDITION VERIFICATION HANDLER
  //
  //    Called when the user taps a VerificationStatusCircle.
  //    Flow:
  //    1. Set verifyingMetric → spinner appears on the tapped circle
  //    2. Call the backend verify mutation with { instanceId, metricKey }
  //    3. Backend validates, persists result, returns { status, success, message }
  //    4. Store the returned `status` in conditionStatuses → circle updates
  //    5. On error → mark as "failed" so the user sees the retry icon
  //    6. Always clear verifyingMetric → spinner stops
  // ═══════════════════════════════════════════════════════════════════════════

  const handleVerifyCondition = async (metricKey: string) => {
    // Guard: don't fire if no event or another verification is in progress
    if (!currentEvent?._id || verifyingMetric) return;

    setVerifyingMetric(metricKey);
    try {
      const result = await verifyMutation({
        instanceId: currentEvent._id as any,
        metricKey,
      });
      console.log(`[EventDetailModal] ${metricKey} verification:`, result);

      // Use the backend's return value to update the circle immediately.
      // No live subscription needed — this is instant from the mutation response.
      setConditionStatuses((prev: Record<string, string>) => ({
        ...prev,
        [metricKey]: (result as any).status,
      }));
    } catch (error: any) {
      console.error(`[EventDetailModal] ${metricKey} verification failed:`, error);
      // On error, show the "failed" state so the user can retry
      setConditionStatuses((prev: Record<string, string>) => ({
        ...prev,
        [metricKey]: 'failed',
      }));
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
                
                {/* All Day Row — tappable circle triggers time verification */}
                <UView className="flex-row items-center mb-6">
                    <MaterialCommunityIcons name="clock-time-four-outline" size={28} color="#9CA3AF" style={{ marginRight: 16 }} />
                    <UView className="flex-1 mr-4 overflow-hidden">
                        <BodyText className="text-white text-base">All-day</BodyText>
                    </UView>
                    <VerificationStatusCircle 
                      status={(conditionStatuses['time'] as any) ?? 'neutral'}
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

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
});
