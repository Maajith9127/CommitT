/**
 * EventDetailModal
 * 
 * A centralized singleton component responsible for displaying detailed information
 * regarding a specific task instance or calendar event.
 * 
 * Core Functionality:
 * - Reactive Data Synchronization: Implements a hybrid approach using a static Zustand 
 *   snapshot for immediate rendering (minimizing perceived latency) followed by a 
 *   live Convex subscription for real-time status updates.
 * - Condition Verification: Manages the lifecycle of condition verification mutations 
 *   (e.g., location validation) and local UI state for immediate feedback.
 * - Singleton Pattern: Ensures only one instance of the modal is mounted across the 
 *   application coordinate system to prevent overlapping transitions.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { withUniwind } from 'uniwind';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@commit/backend/convex/_generated/api';

import { useCalendarStore } from '@/stores/useCalendarStore';

// ── Sub-components (each owns its own UI section) ───────────────────────────
import { EventDetailHeader } from './EventDetailHeader';
import { EventDetailTime } from './EventDetailTime';
import { LocationSection } from './EventDetailLocation';
import { PenaltySection, WaiverSection } from './EventDetailConditions';
import { ActionMenu, ActionMenuItem } from '@/components/ui/commits/ActionMenu';
import { ConfirmationModal } from './ConfirmationModal';
import { WaiverActionModal } from './WaiverActionModal';
import { useTaskActions } from '@/hooks/commits/useTaskActions';
import { useRouter } from 'expo-router';

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

  // 1. Singleton ownership management
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

  // 2. Data subscription and reactive synchronization
  const eventId = useCalendarStore((state) => state.selectedEventId);
  const selectedTaskId = useCalendarStore((state) => state.selectedEventTaskId);
  const selectedEventSnapshot = useCalendarStore((state) => state.selectedEvent);
  const setSelectedEventId = useCalendarStore((state) => state.setSelectedEventId);

  // Establish a live backend subscription via useQuery.
  // This ensures that any server-side state changes (e.g. checkpoint expiration)
  // are reflected in the UI in real-time while the modal is active.
  const liveEvent = useQuery(
    api.api.instances.read.get, 
    selectedTaskId ? { id: selectedTaskId as any } : "skip"
  );

  /** 
   * Truthy union of static snapshot and live data.
   * We prefer the live subscription, but fall back to the Zustand snapshot
   * to prevent a "Loading" blink when the modal first slides up.
   */
  const currentEvent = liveEvent || selectedEventSnapshot; 

  const isVisible = !!eventId;
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // 3. Verification state management
  const verifyMutation = useMutation(api.api.commitments.verify.default);
  const [verifyingMetric, setVerifyingMetric] = useState<string | null>(null);
  const [conditionStatuses, setConditionStatuses] = useState<Record<string, string>>({});

  // Failure modal state — shown when verification returns a non-success result
  const [failureModal, setFailureModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // Track the ID we last seeded to avoid infinite overwrite loops with live data
  const [seededTaskId, setSeededTaskId] = useState<string | null>(null);

  // ── Action Menu State ──
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [waiverModalVisible, setWaiverModalVisible] = useState(false);
  const [waiverConfirmVisible, setWaiverConfirmVisible] = useState(false);

  // Derive the effective status for the header badge.
  // For checkpoint-based tasks, we calculate the status from the live subscription
  // to ensure the UI reflects real-time progression correctly.
  const displayStatus = (() => {
    if (!currentEvent) return "pending";
    const style = currentEvent.config?.verification_style;
    
    // For 'just_show_up', we are 'proceeded' if the single checkpoint is verified.
    if (style === "just_show_up" && Array.isArray(currentEvent.checkpoints) && currentEvent.checkpoints.length > 0) {
      const cp = currentEvent.checkpoints[0];
      const statuses = cp.verification_status || {};
      const allVerified = Object.keys(statuses).every(key => (statuses as any)[key] === "verified");
      return allVerified ? "proceeded" : currentEvent.status;
    }
    
    // For 'stay_throughout', we rely on the backend aggregate for now.
    return currentEvent.status;
  })();

  useEffect(() => {
    // If we closed the modal, reset everything
    if (!eventId) {
      setConditionStatuses({});
      setSeededTaskId(null);
      return;
    }

    // Only seed the local verification state if a new task instance has been selected.
    // This ensures that live data updates do not unexpectedly reset transient UI state
    // while a user may be mid-interaction.
    if (currentEvent && selectedTaskId !== seededTaskId) {
      const initial: Record<string, string> = {};
      const style = currentEvent.config?.verification_style;
      const isCheckpointStyle = style === "stay_throughout" || style === "just_show_up";

      if (isCheckpointStyle && Array.isArray(currentEvent.checkpoints)) {
        // Core Logic: Pull verification state from the active time window (checkpoint).
        // If multiple exist (stay_throughout), we pick the one matching 'now'.
        const now = Date.now();
        const activeCp = currentEvent.checkpoints.find((cp: any) => 
          now >= (cp.start ?? cp.scheduled_time) && now <= (cp.end ?? cp.window_end_time)
        );
        
        if (activeCp?.verification_status) {
          const vs = activeCp.verification_status;
          Object.keys(vs).forEach((key: string) => {
            initial[key] = (vs as any)[key];
          });
        }
      } else if (Array.isArray((currentEvent as any).conditions)) {
        // Fallback for traditional single-event tasks.
        (currentEvent as any).conditions.forEach((cond: any) => {
          if (cond.metric_key && cond.status) {
            initial[cond.metric_key] = cond.status;
          }
        });
      }

      setConditionStatuses(initial);
      setSeededTaskId(selectedTaskId);
    }
  }, [eventId, currentEvent, selectedTaskId, seededTaskId]);

  // 4. Input and Action Handlers
  const router = useRouter();
  const { deleteTask, deleteInstance, setDraft, resetDraft } = useTaskActions();

  const handleClose = useCallback(() => {
    setSelectedEventId(null);
    setMenuVisible(false);
  }, [setSelectedEventId]);

  const handleOpenMenu = useCallback((pos: { x: number; y: number }) => {
      setMenuPosition(pos);
      setMenuVisible(true);
  }, []);

  const actionMenuItems: ActionMenuItem[] = useMemo(() => [
    {
      icon: "delete-outline",
      label: "Delete",
      color: "#FF3B30",
      onPress: () => setDeleteConfirmVisible(true),
    },
    {
      icon: "content-copy",
      label: "Duplicate",
      onPress: () => {
        if (!currentEvent) return;
        resetDraft();
        setDraft({
          ...currentEvent,
          _id: undefined,
          id: undefined,
        });
        handleClose();
        router.push("/(create-commit)/final");
      },
    },
    {
      icon: "content-copy",
      label: "Copy to...",
      onPress: () => console.log("Copy to action triggered"),
    },
    {
      icon: "help-circle-outline",
      label: "Help & feedback",
      onPress: () => console.log("Help action triggered"),
    },
  ], [currentEvent, resetDraft, setDraft, handleClose, router]);

  const confirmDelete = async () => {
    if (selectedTaskId) {
      setIsDeleting(true);
      try {
        await deleteInstance(selectedTaskId);
        setDeleteConfirmVisible(false);
        handleClose();
      } finally {
        setIsDeleting(false);
      }
    }
  };

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
          title: message,
          message: '',
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
        title: errorMsg,
        message: '',
      });
    } finally {
      setVerifyingMetric(null);
    }
  };



  // 5. Early return logic (post-hook execution)

  if (!isOwner) return null;

  if (!currentEvent) {
    return (
      <Modal visible={false} transparent animationType="slide" onRequestClose={handleClose}>
        <View />
      </Modal>
    );
  }

  // 6. Primary Render Logic

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
            status={displayStatus}
            onClose={handleClose}
            onMoreOptions={handleOpenMenu}
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
            <WaiverSection 
              event={currentEvent} 
              onPress={() => setWaiverConfirmVisible(true)}
            />

          </UScroll>

        </UView>

        {/* ── Action Menu Component ── */}
        <ActionMenu
            visible={menuVisible}
            onClose={() => setMenuVisible(false)}
            anchorPosition={menuPosition}
            items={actionMenuItems}
        />
      </View>

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmationModal
        visible={deleteConfirmVisible}
        title="Delete this instance?"
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="#FF3B30"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
        isLoading={isDeleting}
      />

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

      {/* ── Waiver Action Modal ── */}
      <WaiverActionModal
        visible={waiverModalVisible}
        onClose={() => setWaiverModalVisible(false)}
      />

      {/* ── Waiver Start Confirmation Modal ── */}
      <ConfirmationModal
        visible={waiverConfirmVisible}
        title={`Hey Do u want to start a Waive off session for this task?\n\n(if started you will have to finish within the delay, also don't worry if waiver session is enabled you can still verify the task)`}
        confirmText="Start"
        cancelText="Cancel"
        confirmColor="#4FA0FF"
        cancelColor="#FF3B30"
        onConfirm={() => {
          setWaiverConfirmVisible(false);
          setWaiverModalVisible(true);
        }}
        onCancel={() => setWaiverConfirmVisible(false)}
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
