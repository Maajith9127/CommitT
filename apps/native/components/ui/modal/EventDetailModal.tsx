/**
 * EventDetailModal
 * ─────────────────────────────────────────────────────────────────────────────
 * A centralized singleton component responsible for displaying detailed
 * information regarding a specific task instance or calendar event.
 *
 * ARCHITECTURE (Post-Refactor):
 *   This file is now a PURE RENDER ORCHESTRATOR. All business logic,
 *   data fetching, state management, and action handling have been extracted
 *   into the `useEventDetail` custom hook.
 *
 *   EventDetailModal.tsx (this file — render only)
 *     ├── BaseDrawerModal (reusable slide-up shell)
 *     ├── useEventDetail (custom hook — data + state + actions)
 *     └── Sub-components (presentational children)
 *           ├── EventDetailHeader
 *           ├── EventDetailTime
 *           ├── LocationSection
 *           ├── BlocklistSection
 *           ├── PenaltySection
 *           └── WaiverSection
 *
 * SINGLETON PATTERN:
 *   Ensures only one instance of the modal is mounted across the
 *   application coordinate system to prevent overlapping transitions.
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { withUniwind } from 'uniwind';

// ── Core Infrastructure ────────────────────────────────────────────────────
import { BaseDrawerModal } from './BaseDrawerModal';
import { useEventDetail } from '@/hooks/modal/useEventDetail';

// ── Sub-components (each owns its own UI section) ───────────────────────────
import { EventDetailHeader } from './EventDetailHeader';
import { EventDetailTime } from './EventDetailTime';
import { LocationSection } from './EventDetailLocation';
import { PenaltySection, WaiverSection, BlocklistSection } from './EventDetailConditions';
import { ActionMenu } from '@/components/ui/commits/ActionMenu';
import { ConfirmationModal } from './ConfirmationModal';
import { WaiverActionModal } from './WaiverActionModal';
import { BlocklistActionModal } from './BlocklistActionModal';

// ── Uniwind-wrapped primitives ──────────────────────────────────────────────
const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON GUARD
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

  // 2. All data, state, and actions from the extracted hook
  const state = useEventDetail();

  // 3. Early return guards (post-hook — hooks must always run)
  if (!isOwner) return null;

  if (!state.currentEvent) {
    return (
      <BaseDrawerModal visible={false} onClose={state.handleClose}>
        <View />
      </BaseDrawerModal>
    );
  }

  // 4. Pure Render
  return (
    <>
      <BaseDrawerModal
        visible={state.isVisible}
        onClose={state.handleClose}
      >
        {/* ── Header: Close (×), Title, Description, Status Badge ── */}
        <EventDetailHeader
          title={state.currentEvent.title}
          description={state.currentEvent.description}
          status={state.displayStatus}
          onClose={state.handleClose}
          onMoreOptions={state.handleOpenMenu}
        />

        {/* ── Scrollable Content ── */}
        <UScroll
          className="flex-1 bg-[#1A1A1A]"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          scrollEnabled={state.scrollEnabled}
        >
          {/* ── Time Window (Live Timer) ── */}
          <EventDetailTime
            start={state.currentEvent.start}
            end={state.currentEvent.end}
            status={state.currentEvent.status}
            config={state.currentEvent.config}
            checkpoints={(state.currentEvent as any).checkpoints}
            strictUntil={state.currentEvent.strict_until}
          />

          {/* ── GPS Location (embedded Google Map) ── */}
          <LocationSection
            event={state.currentEvent}
            onMapTouchStart={() => state.setScrollEnabled(false)}
            onMapTouchEnd={() => state.setScrollEnabled(true)}
            locStatus={state.conditionStatuses['location'] ?? 'neutral'}
            isLocVerifying={state.verifyingMetric === 'location'}
            onVerifyLoc={(evidence: any) => state.handleVerifyCondition('location', evidence)}
            onStatusPress={() => state.handleStatusPress('location')}
            onError={(msg: string) => state.setFailureModal({ visible: true, title: msg, message: '' })}
          />

          {/* ── Blocked Apps ── */}
          <BlocklistSection
            event={state.currentEvent}
            onPress={() => state.setBlocklistModalVisible(true)}
          />

          {/* ── Financial Penalty ── */}
          <PenaltySection event={state.currentEvent} />

          {/* ── Waiver / Grace Period ── */}
          <WaiverSection
            event={state.currentEvent}
            onPress={() => {
              if (state.currentEvent.status === 'waiver_active') {
                state.setWaiverModalVisible(true);
              } else {
                state.setWaiverConfirmVisible(true);
              }
            }}
          />
        </UScroll>

        {/* ── Action Menu Component ── */}
        <ActionMenu
          visible={state.menuVisible}
          onClose={state.closeMenu}
          anchorPosition={state.menuPosition}
          items={state.actionMenuItems}
        />
      </BaseDrawerModal>

      {/* ── Confirmation Modals (rendered outside BaseDrawerModal for z-index) ── */}

      {/* Delete Confirmation */}
      <ConfirmationModal
        visible={state.deleteConfirmVisible}
        title="Delete this instance?"
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="#FF3B30"
        onConfirm={state.confirmDelete}
        onCancel={() => state.setDeleteConfirmVisible(false)}
        isLoading={state.isDeleting}
      />

      {/* Failure Reason Modal */}
      <ConfirmationModal
        visible={state.failureModal.visible}
        title={state.failureModal.title}
        message={state.failureModal.message}
        confirmText="OK"
        confirmColor="#FF3B30"
        singleButton={true}
        onConfirm={() => state.setFailureModal({ visible: false, title: '', message: '' })}
        onCancel={() => state.setFailureModal({ visible: false, title: '', message: '' })}
      />

      {/* Waiver Action Modal */}
      <WaiverActionModal
        visible={state.waiverModalVisible}
        event={state.currentEvent}
        onClose={() => state.setWaiverModalVisible(false)}
      />

      {/* Blocklist Action Modal */}
      <BlocklistActionModal
        visible={state.blocklistModalVisible}
        event={state.currentEvent}
        onClose={() => state.setBlocklistModalVisible(false)}
      />

      {/* Waiver Start Confirmation */}
      <ConfirmationModal
        visible={state.waiverConfirmVisible}
        title={`Hey Do u want to start a Waive off session for this task?\n\n(if started you will have to finish within the delay, also don't worry if waiver session is enabled you can still verify the task)`}
        confirmText="Start"
        cancelText="Cancel"
        confirmColor="#4FA0FF"
        cancelColor="#FF3B30"
        isLoading={state.isStartingWaiver}
        onConfirm={state.handleStartWaiver}
        onCancel={() => state.setWaiverConfirmVisible(false)}
      />

      {/* Strict Mode Confirmation */}
      <ConfirmationModal
        visible={state.strictConfirmVisible}
        title={`Activate Strict Mode?\n(You won't be able to edit or delete this task until it ends)`}
        confirmText="Activate"
        cancelText="Cancel"
        confirmColor="#4FA0FF"
        cancelColor="#FF3B30"
        isLoading={state.isLocking}
        onConfirm={state.handleActivateStrict}
        onCancel={() => state.setStrictConfirmVisible(false)}
      />
    </>
  );
});
