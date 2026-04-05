/**
 * useEventDetail
 * ══════════════════════════════════════════════════════════════════════════════
 * THE ACTION ORCHESTRATOR FOR TASK INSTANCES
 * ──────────────────────────────────────────────────────────────────────────────
 * Encapsulates data subscriptions, optimistic UI state, and cross-layer 
 * synchronization (Saga pattern) for individual commitment interactions.
 * 
 * DESIGN PRINCIPLES:
 * 1. ATOMICITY: Status changes must sync across Cloud, Disk, and Hardware.
 * 2. RESILIENCE: Failed hardware phases trigger compensating rollbacks.
 * 3. TRANSPARENCY: User is notified of sync aborted/failed states immediately.
 * ══════════════════════════════════════════════════════════════════════════════
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
import { TripleWriteOrchestrator } from "@/lib/triple-write-orchestrator";
import { useChaosStore } from "@/stores/useChaosStore";
import { Logger } from '@/lib/logger';
import type { ActionMenuItem } from '@/components/ui/commits/ActionMenu';

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface EventDetailState {
  /** The currently active task instance (live subscription) */
  currentEvent: any;
  /** Visibility status of the parent modal */
  isVisible: boolean;
  /** Human-readable status derived from conditions/checkpoints */
  displayStatus: string;
  
  /** UI State: Gesture/Scroll interaction control */
  scrollEnabled: boolean;
  setScrollEnabled: (v: boolean) => void;

  /** Verification State */
  conditionStatuses: Record<string, string>;
  verifyingMetric: string | null;
  handleVerifyCondition: (metricKey: string, evidence?: any) => Promise<void>;

  /** Action Menu State */
  menuVisible: boolean;
  menuPosition: { x: number; y: number };
  actionMenuItems: ActionMenuItem[];
  handleOpenMenu: (pos: { x: number; y: number }) => void;
  closeMenu: () => void;

  /** Lifecycle Handlers */
  handleClose: () => void;
  handleEditTask: () => void;

  /** Orchestrated Actions (Deletes, Waivers, Strict Mode) */
  deleteConfirmVisible: boolean;
  setDeleteConfirmVisible: (v: boolean) => void;
  confirmDelete: () => Promise<void>;
  isDeleting: boolean;

  waiverModalVisible: boolean;
  setWaiverModalVisible: (v: boolean) => void;
  waiverConfirmVisible: boolean;
  setWaiverConfirmVisible: (v: boolean) => void;
  isStartingWaiver: boolean;
  handleStartWaiver: () => Promise<void>;

  strictConfirmVisible: boolean;
  setStrictConfirmVisible: (v: boolean) => void;
  isLocking: boolean;
  handleActivateStrict: () => Promise<void>;

  /** Error State */
  failureModal: { visible: boolean; title: string; message: string };
  setFailureModal: (v: { visible: boolean; title: string; message: string }) => void;
  
  /** Blocklist State */
  blocklistModalVisible: boolean;
  setBlocklistModalVisible: (v: boolean) => void;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Standardizes Convex server errors into user-friendly strings.
 */
function parseError(error: any): string {
  let errorMsg = 'An unexpected system error occurred.';
  if (error?.message) {
    const match = error.message.match(/Uncaught Error:\s*(?:[A-Z_]+:\s*)?(.*?)(?:\n|$)/);
    errorMsg = match?.[1]?.trim() || error.message.split('\n')[0].replace(/^[A-Z_]+:\s*/, '').trim();
  }
  return errorMsg;
}

// ─── HOOK ───────────────────────────────────────────────────────────────────

export function useEventDetail(): EventDetailState {
  const db = useSQLiteContext();
  const router = useRouter();

  // 1. STORE & SUBSCRIPTION LAYER
  const eventId = useCalendarStore((s) => s.selectedEventId);
  const selectedTaskId = useCalendarStore((s) => s.selectedEventTaskId);
  const selectedEventSnapshot = useCalendarStore((s) => s.selectedEvent);
  const setSelectedEventId = useCalendarStore((s) => s.setSelectedEventId);

  const liveEvent = useQuery(
    api.api.instances.read.get,
    selectedTaskId ? { id: selectedTaskId as any } : "skip"
  );

  const currentEvent = liveEvent || selectedEventSnapshot;
  const isVisible = !!eventId;

  // 2. INTERNAL UI STATE
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [verifyingMetric, setVerifyingMetric] = useState<string | null>(null);
  const [seededTaskId, setSeededTaskId] = useState<string | null>(null);
  const [conditionStatuses, setConditionStatuses] = useState<Record<string, string>>({});

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [waiverModalVisible, setWaiverModalVisible] = useState(false);
  const [waiverConfirmVisible, setWaiverConfirmVisible] = useState(false);
  const [strictConfirmVisible, setStrictConfirmVisible] = useState(false);
  const [blocklistModalVisible, setBlocklistModalVisible] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isStartingWaiver, setIsStartingWaiver] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [failureModal, setFailureModal] = useState({ visible: false, title: '', message: '' });

  // 3. MUTATION LAYER
  const verifyMutation = useMutation(api.api.commitments.verify.default);
  const startWaiverMutation = useMutation(api.api.instances.waivers.startSession);
  const updateInstanceMutation = useMutation(api.api.instances.update.update);
  const { deleteTask, deleteInstance, setDraft, resetDraft } = useTaskActions();

  // 4. DERIVED STATE & SYNC
  const handleClose = useCallback(() => {
    setSelectedEventId(null);
    setMenuVisible(false);
  }, [setSelectedEventId]);

  const displayStatus = useMemo(() => {
    if (!currentEvent) return "pending";
    const conditions = currentEvent.conditions || [];
    const allVerified = conditions.length > 0 && conditions.every((c: any) => c.status === "verified");
    return allVerified ? "proceeded" : currentEvent.status;
  }, [currentEvent]);

  // Seed local condition statuses from live data
  useEffect(() => {
    if (!isVisible) {
      setConditionStatuses({});
      setSeededTaskId(null);
      return;
    }
    if (currentEvent && selectedTaskId !== seededTaskId) {
      const initial: Record<string, string> = {};
      (currentEvent.conditions || []).forEach((c: any) => {
        if (c.metric_key) initial[c.metric_key] = c.status;
      });
      setConditionStatuses(initial);
      setSeededTaskId(selectedTaskId);
    }
  }, [isVisible, currentEvent, selectedTaskId, seededTaskId]);

  // 5. ORCHESTRATED ACTIONS (SAGA PATTERN)

  /**
   * handleVerifyCondition: Atomic Proof Verification
   * Syncs proof status to Cloud ➔ Disk ➔ Hardware (Alarm Silence).
   */
  const handleVerifyCondition = useCallback(async (metricKey: string, evidence?: any) => {
    if (!currentEvent?._id || verifyingMetric) return;
    setVerifyingMetric(metricKey);

    const context = { metricKey, evidence, instanceId: currentEvent._id };
    const orchestrator = new TripleWriteOrchestrator(context);

    orchestrator
      .addStep("Cloud Verification", async (ctx) => {
          Logger.info(`[VerifySaga] Step 1: Cloud Proof for ${ctx.instanceId} (${ctx.metricKey})`);
          if (typeof __DEV__ !== 'undefined' && __DEV__ && useChaosStore.getState().faultCloudWrite) 
             throw new Error("[CHAOS] Convex verification failure.");
          return await verifyMutation({
            instanceId: ctx.instanceId as any,
            metricKey: ctx.metricKey,
            evidence: ctx.evidence,
          });
      })
      .addStep("Disk Sync", async (ctx, prev) => {
          Logger.info(`[VerifySaga] Step 2: Disk Cache Update for ${ctx.instanceId}`);
          if (typeof __DEV__ !== 'undefined' && __DEV__ && useChaosStore.getState().faultDiskWrite) 
             throw new Error("[CHAOS] SQLite sync failure.");
          const result = prev["Cloud Verification"] as any;
          if (result.status === 'verified') {
              const conditions = currentEvent.conditions.map((c: any) =>
                c.metric_key === ctx.metricKey ? { ...c, status: 'verified' } : c
              );
              await updateInstanceInLocalDb(db, ctx.instanceId, {
                status: result.instanceStatus,
                conditions,
              });
              Logger.info(`[VerifySaga] Disk marked verified for ${ctx.instanceId}`);
          }
      })
      .addStep("Hardware Silence", async () => {
          Logger.info(`[VerifySaga] Step 3: Killing Hardware Alarm for ${context.instanceId}`);
          if (typeof __DEV__ !== 'undefined' && __DEV__ && useChaosStore.getState().faultHardware) 
             throw new Error("[CHAOS] Alarm manager failure.");
          scheduleNextAlarm();
          Logger.info(`[VerifySaga] Saga Complete for ${context.instanceId}`);
      });

    try {
      const exec = await orchestrator.execute();
      if (exec.success) {
        const result = exec.results["Cloud Verification"] as any;
        setConditionStatuses((p) => ({ ...p, [metricKey]: result.status }));
      } else {
        Logger.error(`[VerifySaga] Failed for ${currentEvent._id}`, exec.error);
        setFailureModal({ visible: true, title: exec.error || "Sync Aborted", message: '' });
      }
    } catch (err: any) {
      Logger.error(`[VerifySaga] CRITICAL FAILURE for ${currentEvent._id}`, err);
      setFailureModal({ visible: true, title: parseError(err), message: '' });
    } finally {
      setVerifyingMetric(null);
    }
  }, [currentEvent, verifyingMetric, verifyMutation, db]);

  /**
   * confirmDelete: Atomic Instance Deletion
   * ─────────────────────────────────────────────────────────────────────────────
   * CRITICAL FIX: We use `deleteInstance` (api/instances/delete) instead of 
   * `deleteTask` (api/commitments/delete). The EventDetailModal operates on
   * individual task instances, NOT parent commitments. Passing a taskInstances 
   * ID to commitments/delete caused a Server Error because Convex expected a 
   * tasks table ID.
   */
  const confirmDelete = useCallback(async () => {
    if (!selectedTaskId) return;
    setIsDeleting(true);
    try {
      const result = await deleteInstance(selectedTaskId);
      if (result.success) {
        setDeleteConfirmVisible(false);
        handleClose();
      } else {
        setFailureModal({ visible: true, title: result.error || "Action Refused", message: '' });
      }
    } catch (err) {
      setFailureModal({ visible: true, title: parseError(err), message: '' });
    } finally {
      setIsDeleting(false);
    }
  }, [selectedTaskId, deleteInstance, handleClose]);

  /**
   * handleStartWaiver: Simple Waiver Activation
   * Non-saga because failure is non-destructive (e.g. task already fulfilled).
   */
  const handleStartWaiver = useCallback(async () => {
    if (!currentEvent?._id) return;
    setIsStartingWaiver(true);
    try {
      const result = (await startWaiverMutation({ instanceId: currentEvent._id })) as any;
      
      if (result && result.success === false) {
        Logger.warn(`[WaiverAction] Cloud rejected waiver for ${currentEvent._id}: ${result.message}`);
        setWaiverConfirmVisible(false); // Dismiss confirm modal on failure
        setFailureModal({ visible: true, title: result.message || "Waiver Denied", message: '' });
        return;
      }
      
      Logger.info(`[WaiverAction] Step 2: Marking Disk 'waived' for ${currentEvent._id}`);
      await updateInstanceInLocalDb(db, currentEvent._id, { status: 'waived' });
      Logger.info(`[WaiverAction] Step 3: Updating Hardware Alarms for ${currentEvent._id}`);
      scheduleNextAlarm();
      Logger.info(`[WaiverAction] Complete for ${currentEvent._id}`);
      
      setWaiverConfirmVisible(false);
      setWaiverModalVisible(true);
    } catch (err) {
      Logger.error(`[WaiverAction] FAILURE for ${currentEvent?._id}`, err);
      setWaiverConfirmVisible(false);
      setFailureModal({ visible: true, title: parseError(err), message: '' });
    } finally {
      setIsStartingWaiver(false);
    }
  }, [currentEvent, startWaiverMutation, db]);

  /**
   * handleActivateStrict: Atomic Strict Mode Lock
   * Forces hardware kernel arming.
   */
  const handleActivateStrict = useCallback(async () => {
    if (!currentEvent?._id) return;
    setIsLocking(true);
    
    const context = { instanceId: currentEvent._id, end: currentEvent.end };
    const orchestrator = new TripleWriteOrchestrator(context);

    orchestrator
      .addStep("Cloud Lock", async (ctx) => {
          Logger.info(`[StrictSaga] Step 1: Cloud Lock for ${ctx.instanceId}`);
          await updateInstanceMutation({ id: ctx.instanceId as any, strict_until: ctx.end, is_manual_edit: true });
      })
      .addStep("Disk Lock", async (ctx) => {
          Logger.info(`[StrictSaga] Step 2: Disk Lock for ${ctx.instanceId}`);
          await updateInstanceInLocalDb(db, ctx.instanceId, { strict_until: ctx.end, is_manual_edit: true });
      })
      .addStep("Hardware Lock", async () => {
          Logger.info(`[StrictSaga] Step 3: Hardware Kernel Arming for ${context.instanceId}`);
          scheduleNextAlarm();
          Logger.info(`[StrictSaga] Saga Complete for ${context.instanceId}`);
      });

    try {
      const exec = await orchestrator.execute();
      if (exec.success) {
        setStrictConfirmVisible(false);
      } else {
        Logger.error(`[StrictSaga] Failed for ${currentEvent._id}`, exec.error);
        setFailureModal({ visible: true, title: exec.error || "Lock Refused", message: '' });
      }
    } catch (err) {
      Logger.error(`[StrictSaga] CRITICAL FAILURE for ${currentEvent._id}`, err);
      setFailureModal({ visible: true, title: parseError(err), message: '' });
    } finally {
      setIsLocking(false);
    }
  }, [currentEvent, updateInstanceMutation, db]);

  /**
   * handleEditTask: Pivot to Creation flow
   */
  const handleEditTask = useCallback(() => {
    if (currentEvent) {
      resetDraft();
      setDraft({ ...currentEvent, id: currentEvent.task_id });
      handleClose();
      router.push("/(create-commit)/final");
    }
  }, [currentEvent, resetDraft, setDraft, handleClose, router]);

  // 6. ACTION MENU CONFIGURATION
  const actionMenuItems: ActionMenuItem[] = useMemo(() => [
    { 
        icon: "delete-outline", 
        label: "Delete", 
        color: "#FF3B30", 
        onPress: () => setDeleteConfirmVisible(true) 
    },
    { 
        icon: "lock-outline", 
        label: "Strict Mode", 
        onPress: () => { setMenuVisible(false); setStrictConfirmVisible(true); } 
    },
    { 
        icon: "content-copy", 
        label: "Duplicate", 
        onPress: () => {
          if (!currentEvent) return;
          resetDraft();
          setDraft({ ...currentEvent, _id: undefined, id: undefined });
          handleClose();
          router.push("/(create-commit)/final");
        } 
    },
    {
        icon: "help-circle-outline",
        label: "Help",
        onPress: () => {
          setMenuVisible(false);
          // Placeholder for Help behavior
          console.log("[ActionMenu] Help requested for event:", currentEvent?._id);
        }
    }
  ], [currentEvent, resetDraft, setDraft, handleClose, router]);

  // 7. EXPORT
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
    handleOpenMenu: (pos) => { setMenuPosition(pos); setMenuVisible(true); },
    closeMenu: () => setMenuVisible(false),
    handleClose,
    handleEditTask,
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
