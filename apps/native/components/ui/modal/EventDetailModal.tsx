/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  EventDetailModal — Global Singleton Event Viewer                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  PURPOSE:                                                                    ║
 * ║  Full-screen bottom sheet that displays the details of a selected            ║
 * ║  calendar event / task instance.                                             ║
 * ║                                                                              ║
 * ║  ARCHITECTURE:                                                               ║
 * ║  This file is the ORCHESTRATOR. It owns:                                     ║
 * ║  • Singleton guard (prevents Expo Router double-mount)                       ║
 * ║  • Zustand state (selectedEventId, selectedEvent)                            ║
 * ║  • Verification state & mutation handler                                     ║
 * ║  • Modal shell (<Modal>, overlay, scroll container)                          ║
 * ║                                                                              ║
 * ║  All UI sections are delegated to focused sub-components:                    ║
 * ║  ┌────────────────────────────────────────────────────────────────────┐      ║
 * ║  │  EventDetailHeader      → Close button, title, description, badge  │      ║
 * ║  │  EventDetailTime        → Time window + verification circle        │      ║
 * ║  │  LocationSection        → Embedded Google Map                      │      ║
 * ║  │  PenaltySection         → Financial penalty details                │      ║
 * ║  │  WaiverSection          → Waiver / grace period details            │      ║
 * ║  └────────────────────────────────────────────────────────────────────┘      ║
 * ║                                                                              ║
 * ║  DATA FLOW:                                                                  ║
 * ║  1. User taps event → setSelectedEventId(id, data) → Zustand stores it       ║
 * ║  2. This modal reads Zustand → <Modal visible={true}> slides up              ║
 * ║  3. On close: setSelectedEventId(null) → modal hides                         ║
 * ║                                                                              ║
 * ║  VERIFICATION FLOW:                                                          ║
 * ║  1. User taps VerificationStatusCircle → handleVerifyCondition(key)          ║
 * ║  2. Spinner shows → backend mutation fires → result stored locally           ║
 * ║  3. Circle updates instantly from mutation's return value                    ║
 * ║                                                                              ║
 * ║  WHY LOCAL STATE (not live Convex subscription)?                             ║
 * ║  A live useQuery causes the Google Map to re-render infinitely.              ║
 * ║  We use the mutation's RETURN VALUE for instant UI feedback instead.         ║
 * ║                                                                              ║
 * ║  SINGLETON GUARD:                                                            ║
 * ║  Expo Router can mount _layout.tsx TWICE during Stack transitions.           ║
 * ║  Module-level `isInstanceMounted` ensures only ONE renders.                  ║
 * ║                                                                              ║
 * ║  KEY RULES:                                                                  ║
 * ║  • Never pass props — all data comes from Zustand.                           ║
 * ║  • Never mount in individual screens — only in _layout.tsx.                  ║
 * ║  • All hooks called unconditionally (Rules of Hooks).                        ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, View, StyleSheet, ScrollView } from 'react-native';
import { withUniwind } from 'uniwind';
import { useMutation } from 'convex/react';
import { api } from '@commit/backend/convex/_generated/api';

import { useCalendarStore } from '@/stores/useCalendarStore';

// ── Sub-components (each owns its own UI section) ───────────────────────────
import { EventDetailHeader } from './EventDetailHeader';
import { EventDetailTime } from './EventDetailTime';
import { LocationSection } from './EventDetailLocation';
import { PenaltySection, WaiverSection } from './EventDetailConditions';
import { ConfirmationModal } from './ConfirmationModal';

// ── Uniwind-wrapped primitives ──────────────────────────────────────────────
const UView = withUniwind(View);
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
  // ═══════════════════════════════════════════════════════════════════════════

  const eventId = useCalendarStore((state) => state.selectedEventId);
  const currentEvent = useCalendarStore((state) => state.selectedEvent);
  const setSelectedEventId = useCalendarStore((state) => state.setSelectedEventId);

  const isVisible = !!eventId;
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. VERIFICATION STATE
  //
  //    Local state (not live subscription) to avoid Google Map re-renders.
  //    Seeded from Zustand snapshot when a new event is opened.
  // ═══════════════════════════════════════════════════════════════════════════

  const verifyMutation = useMutation(api.api.commitments.verify.default);
  const [verifyingMetric, setVerifyingMetric] = useState<string | null>(null);
  const [conditionStatuses, setConditionStatuses] = useState<Record<string, string>>({});

  // Failure modal state — shown when verification returns a non-success result
  const [failureModal, setFailureModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // Reset & seed when a DIFFERENT event is opened
  useEffect(() => {
    if (eventId && currentEvent) {
      const initial: Record<string, string> = {};
      
      // Seed explicit conditions (e.g., location, photo)
      if (Array.isArray((currentEvent as any).conditions)) {
        (currentEvent as any).conditions.forEach((cond: any) => {
          if (cond.metric_key && cond.status) {
            initial[cond.metric_key] = cond.status;
          }
        });
      }

      setConditionStatuses(initial);
    } else {
      setConditionStatuses({});
    }
  }, [eventId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleClose = useCallback(() => {
    setSelectedEventId(null);
  }, [setSelectedEventId]);

  const handleVerifyCondition = async (metricKey: string, evidence?: any) => {
    if (!currentEvent?._id || verifyingMetric) return;

    setVerifyingMetric(metricKey);
    try {
      const result = await verifyMutation({
        instanceId: currentEvent._id as any,
        metricKey,
        evidence,
      });
      console.log(`[EventDetailModal] ${metricKey} verification:`, result);

      const status = (result as any).status;
      const message = (result as any).message ?? 'Verification failed.';

      setConditionStatuses((prev: Record<string, string>) => ({
        ...prev,
        [metricKey]: status,
      }));

      // If the result is NOT verified → show failure modal with the backend's reason
      if (status !== 'verified') {
        setFailureModal({
          visible: true,
          title: 'Verification Failed',
          message,
        });
      }
    } catch (error: any) {
      setConditionStatuses((prev: Record<string, string>) => ({
        ...prev,
        [metricKey]: 'failed',
      }));

      // Extract a readable message from the error
      let errorMsg = 'Something went wrong. Please try again.';
      if (error?.message) {
        // Match "Uncaught Error: [OPTIONAL_CODE:] Clean message\n"
        const match = error.message.match(/Uncaught Error:\s*(?:[A-Z_]+:\s*)?(.*?)(?:\n|$)/);
        if (match && match[1]) {
          errorMsg = match[1].trim();
        } else {
          // Fallback: take the first line and strip any uppercase prefix codes
          errorMsg = error.message.split('\n')[0].replace(/^[A-Z_]+:\s*/, '').trim();
        }
      }

      setFailureModal({
        visible: true,
        title: 'Verification Error',
        message: errorMsg,
      });
    } finally {
      setVerifyingMetric(null);
    }
  };



  // ═══════════════════════════════════════════════════════════════════════════
  // 5. EARLY RETURNS (after all hooks)
  // ═══════════════════════════════════════════════════════════════════════════

  if (!isOwner) return null;

  if (!currentEvent) {
    return (
      <Modal visible={false} transparent animationType="slide" onRequestClose={handleClose}>
        <View />
      </Modal>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. RENDER — Clean composition of sub-components
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

          {/* ── Header: Close (×), Title, Description, Status Badge ── */}
          <EventDetailHeader
            title={currentEvent.title}
            description={currentEvent.description}
            status={currentEvent.status}
            onClose={handleClose}
          />

          {/* ── Scrollable Content ── */}
          <UScroll
            className="flex-1 bg-[#1A1A1A]"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            scrollEnabled={scrollEnabled}
          >

            {/* ── Time Window (Live Timer) ── */}
            <EventDetailTime
              start={currentEvent.start}
              end={currentEvent.end}
              config={currentEvent.config}
              checkpoints={(currentEvent as any).checkpoints}
            />

            {/* ── GPS Location (embedded Google Map) ── */}
            <LocationSection
              event={currentEvent}
              onMapTouchStart={() => setScrollEnabled(false)}
              onMapTouchEnd={() => setScrollEnabled(true)}
              locStatus={conditionStatuses['location'] ?? 'neutral'}
              isLocVerifying={verifyingMetric === 'location'}
              onVerifyLoc={(evidence: any) => handleVerifyCondition('location', evidence)}
            />

            {/* ── Financial Penalty ── */}
            <PenaltySection event={currentEvent} />

            {/* ── Waiver / Grace Period ── */}
            <WaiverSection event={currentEvent} />

          </UScroll>

        </UView>
      </View>

      {/* ── Failure Reason Modal (overlays on top of the event modal) ── */}
      <ConfirmationModal
        visible={failureModal.visible}
        title={failureModal.title}
        message={failureModal.message}
        confirmText="OK"
        confirmColor="#FF3B30"
        singleButton={true}
        onConfirm={() => setFailureModal({ visible: false, title: '', message: '' })}
        onCancel={() => setFailureModal({ visible: false, title: '', message: '' })}
      />
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
