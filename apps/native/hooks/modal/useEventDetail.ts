/**
 * useEventDetail
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom hook that encapsulates ALL data fetching, state management, and 
 * action handling for the EventDetailModal.
 *
 * This hook owns:
 *   • Live Convex subscription for the selected task instance
 *   • Condition verification state machine (optimistic UI)
 *   • Delete / Waiver / Strict Mode action handlers
 *   • Action menu visibility and positioning
 *   • All confirmation modal visibility toggles
 *   • Error parsing and failure modal state
 *
 * The EventDetailModal component becomes a PURE render orchestrator that
 * simply destructures this hook and passes values to presentational children.
 *
 * ARCHITECTURE:
 *   EventDetailModal.tsx (render)
 *     └── useEventDetail.ts (data + state + actions)
 *           ├── useCalendarStore (Zustand — selected event)
 *           ├── Convex useQuery (live instance subscription)
 *           ├── Convex useMutation (verify, waiver, update)
 *           └── useTaskActions (delete, draft management)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import { api } from '@commit/backend/convex/_generated/api';

import { useCalendarStore } from '@/stores/useCalendarStore';
import { useTaskActions } from '@/hooks/commits/useTaskActions';
import { updateInstanceInLocalDb } from '@/lib/local-db-commits';
import { scheduleNextAlarm } from '@/modules/scheduler-module';
import type { ActionMenuItem } from '@/components/ui/commits/ActionMenu';

// ── Types ───────────────────────────────────────────────────────────────────

export interface EventDetailState {
  // Core data
  currentEvent: any;
  isVisible: boolean;
  displayStatus: string;

  // Scroll control (for embedded maps)
  scrollEnabled: boolean;
  setScrollEnabled: (v: boolean) => void;

  // Condition verification
  conditionStatuses: Record<string, string>;
  verifyingMetric: string | null;
  handleVerifyCondition: (metricKey: string, evidence?: any) => Promise<void>;

  // Action menu
  menuVisible: boolean;
  menuPosition: { x: number; y: number };
  actionMenuItems: ActionMenuItem[];
  handleOpenMenu: (pos: { x: number; y: number }) => void;
  closeMenu: () => void;

  // Close handler
  handleClose: () => void;

  // Delete flow
  deleteConfirmVisible: boolean;
  setDeleteConfirmVisible: (v: boolean) => void;
  confirmDelete: () => Promise<void>;
  isDeleting: boolean;

  // Waiver flow
  waiverModalVisible: boolean;
  setWaiverModalVisible: (v: boolean) => void;
  waiverConfirmVisible: boolean;
  setWaiverConfirmVisible: (v: boolean) => void;
  isStartingWaiver: boolean;
  handleStartWaiver: () => Promise<void>;

  // Strict mode flow
  strictConfirmVisible: boolean;
  setStrictConfirmVisible: (v: boolean) => void;
  isLocking: boolean;
  handleActivateStrict: () => Promise<void>;

  // Blocklist flow
  blocklistModalVisible: boolean;
  setBlocklistModalVisible: (v: boolean) => void;

  // Failure modal
  failureModal: { visible: boolean; title: string; message: string };
  setFailureModal: (v: { visible: boolean; title: string; message: string }) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Robust error parsing for Convex server exceptions */
function parseError(error: any): string {
  let errorMsg = 'Something went wrong. Please try again.';
  if (error?.message) {
    const match = error.message.match(/Uncaught Error:\s*(?:[A-Z_]+:\s*)?(.*?)(?:\n|$)/);
    if (match && match[1]) {
      errorMsg = match[1].trim();
    } else {
      errorMsg = error.message.split('\n')[0].replace(/^[A-Z_]+:\s*/, '').trim();
    }
  }
  return errorMsg;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useEventDetail(): EventDetailState {
  const db = useSQLiteContext();
  const router = useRouter();

  // ── Store bindings ──
  const eventId = useCalendarStore((state) => state.selectedEventId);
  const selectedTaskId = useCalendarStore((state) => state.selectedEventTaskId);
  const selectedEventSnapshot = useCalendarStore((state) => state.selectedEvent);
  const setSelectedEventId = useCalendarStore((state) => state.setSelectedEventId);

  // ── Live backend subscription ──
  const liveEvent = useQuery(
    api.api.instances.read.get,
    selectedTaskId ? { id: selectedTaskId as any } : "skip"
  );

  const currentEvent = liveEvent || selectedEventSnapshot;
  const isVisible = !!eventId;

  // ── UI state ──
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [verifyingMetric, setVerifyingMetric] = useState<string | null>(null);
  const [conditionStatuses, setConditionStatuses] = useState<Record<string, string>>({});
  const [seededTaskId, setSeededTaskId] = useState<string | null>(null);

  // ── Modal visibility state ──
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [waiverModalVisible, setWaiverModalVisible] = useState(false);
  const [waiverConfirmVisible, setWaiverConfirmVisible] = useState(false);
  const [isStartingWaiver, setIsStartingWaiver] = useState(false);
  const [strictConfirmVisible, setStrictConfirmVisible] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [blocklistModalVisible, setBlocklistModalVisible] = useState(false);
  const [failureModal, setFailureModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // ── Mutations ──
  const verifyMutation = useMutation(api.api.commitments.verify.default);
  const startWaiver = useMutation(api.api.instances.waivers.startSession);
  const updateInstance = useMutation(api.api.instances.update.update);
  const { deleteInstance, setDraft, resetDraft } = useTaskActions();

  // ── Derived: Display Status ──
  const displayStatus = (() => {
    if (!currentEvent) return "pending";
    const style = currentEvent.config?.verification_style;

    if (style === "just_show_up" && Array.isArray(currentEvent.checkpoints) && currentEvent.checkpoints.length > 0) {
      const cp = currentEvent.checkpoints[0];
      const statuses = cp.verification_status || {};
      const allVerified = Object.keys(statuses).every(key => (statuses as any)[key] === "verified");
      return allVerified ? "proceeded" : currentEvent.status;
    }

    return currentEvent.status;
  })();

  // ── Seed condition statuses from live data ──
  useEffect(() => {
    if (!eventId) {
      setConditionStatuses({});
      setSeededTaskId(null);
      return;
    }

    if (currentEvent && selectedTaskId !== seededTaskId) {
      const initial: Record<string, string> = {};
      const style = currentEvent.config?.verification_style;
      const isCheckpointStyle = style === "stay_throughout" || style === "just_show_up";

      if (isCheckpointStyle && Array.isArray(currentEvent.checkpoints)) {
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

  // ── Action Handlers ──

  const handleClose = useCallback(() => {
    setSelectedEventId(null);
    setMenuVisible(false);
  }, [setSelectedEventId]);

  const handleOpenMenu = useCallback((pos: { x: number; y: number }) => {
    setMenuPosition(pos);
    setMenuVisible(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const handleVerifyCondition = useCallback(async (metricKey: string, evidence?: any) => {
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

      setConditionStatuses((prev) => ({ ...prev, [metricKey]: status }));

      // ── SYNC LOCAL CACHE ──
      if (status === 'verified') {
        try {
          const updatedConditions = currentEvent.conditions.map((c: any) =>
            c.metric_key === metricKey ? { ...c, status: 'verified' } : c
          );

          await updateInstanceInLocalDb(db, currentEvent._id, {
            status: (result as any).instanceStatus,
            conditions: updatedConditions,
          });
          scheduleNextAlarm();
        } catch (localError) {
          console.error("[EventDetailModal] Local Sync failed:", localError);
        }
      }

      if (status !== 'verified') {
        setFailureModal({ visible: true, title: message, message: '' });
      }
    } catch (error: any) {
      setConditionStatuses((prev) => ({ ...prev, [metricKey]: 'failed' }));
      setFailureModal({ visible: true, title: parseError(error), message: '' });
    } finally {
      setVerifyingMetric(null);
    }
  }, [currentEvent, verifyingMetric, verifyMutation, db]);

  const confirmDelete = useCallback(async () => {
    if (selectedTaskId) {
      setIsDeleting(true);
      try {
        const result = (await deleteInstance(selectedTaskId)) as any;
        if (result && result.success === false) {
          setDeleteConfirmVisible(false);
          setFailureModal({ visible: true, title: result.message || "Action failed.", message: '' });
          return;
        }
        setDeleteConfirmVisible(false);
        handleClose();
      } catch (error) {
        setDeleteConfirmVisible(false);
        setFailureModal({ visible: true, title: parseError(error), message: '' });
      } finally {
        setIsDeleting(false);
      }
    }
  }, [selectedTaskId, deleteInstance, handleClose]);

  const handleStartWaiver = useCallback(async () => {
    if (!currentEvent?._id) return;
    setIsStartingWaiver(true);
    try {
      const result = (await startWaiver({ instanceId: currentEvent._id })) as any;

      if (result && result.success === false) {
        setWaiverConfirmVisible(false);
        setFailureModal({ visible: true, title: result.message || "Cannot start waiver.", message: '' });
        return;
      }

      if (result && (result as any).success !== false) {
        await updateInstanceInLocalDb(db, currentEvent._id, {
          status: 'waiver_active',
          penalty_waiver: currentEvent.penalty_waiver,
        });
        scheduleNextAlarm();
      }

      setWaiverConfirmVisible(false);
      setWaiverModalVisible(true);
    } catch (e: any) {
      console.error("Failed to start waiver session", e);
      setWaiverConfirmVisible(false);
      setFailureModal({ visible: true, title: parseError(e), message: '' });
    } finally {
      setIsStartingWaiver(false);
    }
  }, [currentEvent, startWaiver, db]);

  const handleActivateStrict = useCallback(async () => {
    if (!currentEvent?._id) return;
    setIsLocking(true);
    try {
      const result = (await updateInstance({
        id: currentEvent._id as any,
        strict_until: currentEvent.end,
        is_manual_edit: true,
      })) as any;

      if (result && result.success === false) {
        setStrictConfirmVisible(false);
        setFailureModal({ visible: true, title: result.message || "Lock activation failed.", message: '' });
        return;
      }

      console.log("[STRICT_MODE] Instance successfully locked in the vault.");

      try {
        await updateInstanceInLocalDb(db, currentEvent._id, {
          strict_until: currentEvent.end,
          is_manual_edit: true,
        });
        scheduleNextAlarm();
      } catch (localError) {
        console.error("[STRICT_MODE] Local Sync failed:", localError);
      }

      setStrictConfirmVisible(false);
    } catch (e) {
      setStrictConfirmVisible(false);
      setFailureModal({ visible: true, title: parseError(e), message: '' });
      console.error("[STRICT_MODE] Failed to activate lock:", e);
    } finally {
      setIsLocking(false);
    }
  }, [currentEvent, updateInstance, db]);

  // ── Action Menu Items ──
  const actionMenuItems: ActionMenuItem[] = useMemo(() => [
    {
      icon: "delete-outline",
      label: "Delete",
      color: "#FF3B30",
      onPress: () => setDeleteConfirmVisible(true),
    },
    {
      icon: "lock-outline",
      label: "Lock (Strict Mode)",
      onPress: () => {
        setMenuVisible(false);
        setStrictConfirmVisible(true);
      },
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

  return {
    currentEvent,
    isVisible,
    displayStatus,
    scrollEnabled,
    setScrollEnabled,
    conditionStatuses,
    verifyingMetric,
    handleVerifyCondition,
    menuVisible,
    menuPosition,
    actionMenuItems,
    handleOpenMenu,
    closeMenu,
    handleClose,
    deleteConfirmVisible,
    setDeleteConfirmVisible,
    confirmDelete,
    isDeleting,
    waiverModalVisible,
    setWaiverModalVisible,
    waiverConfirmVisible,
    setWaiverConfirmVisible,
    isStartingWaiver,
    handleStartWaiver,
    strictConfirmVisible,
    setStrictConfirmVisible,
    isLocking,
    handleActivateStrict,
    blocklistModalVisible,
    setBlocklistModalVisible,
    failureModal,
    setFailureModal,
  };
}
