/**
 * useEventDetail
 *
 * THE ACTION ORCHESTRATOR FOR TASK INSTANCES
 *
 * Encapsulates data subscriptions, optimistic UI state, and cross-layer 
 * synchronization (Saga pattern) for individual commitment interactions.
 * 
 * DESIGN PRINCIPLES:
 * 1. ATOMICITY: Status changes must sync across Cloud, Disk, and Hardware.
 * 2. RESILIENCE: Failed hardware phases trigger compensating rollbacks.
 * 3. TRANSPARENCY: User is notified of sync aborted/failed states immediately.
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
import { syncLock } from '@/lib/sync-lock';
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
  handleDuplicate: () => void;

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
  /** Individual Condition Status Tap Handler */
  handleStatusPress: (metricKey: string) => void;
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
  const { deleteInstance, setDraft, resetDraft } = useTaskActions();

  // 4. DERIVED STATE & SYNC
  const handleClose = useCallback(() => {
    setSelectedEventId(null);
    setMenuVisible(false);
  }, [setSelectedEventId]);

  const displayStatus = useMemo(() => {
    if (!currentEvent) return "pending";
    const style = currentEvent.config?.verification_style;
    const now = Date.now();

    // 1. Just Show Up logic: If the first checkpoint is verified, status is 'proceeded'.
    if (style === "just_show_up" && Array.isArray(currentEvent.checkpoints) && currentEvent.checkpoints.length > 0) {
      const cp = currentEvent.checkpoints[0];
      const statuses = cp.verification_status || {};
      const keys = Object.keys(statuses);
      
      const allVerified = keys.length > 0 && keys.every(key => {
        const s = statuses[key];
        return s === "verified" || s === "applied" || s === "waived";
      });

      if (allVerified) return "proceeded";
    }

    // 2. Stay Throughout logic: Check missed threshold at end of task.
    if (style === "stay_throughout" && Array.isArray(currentEvent.checkpoints) && currentEvent.checkpoints.length > 0) {
      const isEnded = now > (currentEvent.end ?? 0);
      
      if (isEnded) {
        const maxMisses = currentEvent.config?.max_misses_allowed ?? 0;
        const missedCount = currentEvent.checkpoints.filter((cp: any) => {
          const vs = cp.verification_status || {};
          const keys = Object.keys(vs);
          // A checkpoint is missed if it has no 'verified' entries
          return keys.length === 0 || keys.every(k => vs[k] !== "verified");
        }).length;

        return missedCount <= maxMisses ? "proceeded" : "failed";
      }
    }

    // Default: Fallback to the live backend status
    return currentEvent.status;
  }, [currentEvent]);

  /**
   * resolvedConditionStatuses: The effective state of each proof section.
   * Merges local optimistic UI status with the backend source of truth.
   * For 'stay_throughout', it specifically reflects the MOST RECENT checkpoint status.
   */
  const resolvedConditionStatuses = useMemo(() => {
    const base = { ...conditionStatuses };
    if (!currentEvent) return base;

    const style = currentEvent.config?.verification_style;
    const now = Date.now();
    
    // 1. Strictly clean any 'failed' statuses from the base for ALL styles
    // This allows clicking the symbol to always trigger a fresh attempt/backend details.
    Object.keys(base).forEach(k => {
      if (base[k] === 'failed') base[k] = 'neutral';
    });

    if (style === "just_show_up" && Array.isArray(currentEvent.checkpoints) && currentEvent.checkpoints.length > 0) {
      const vs = currentEvent.checkpoints[0].verification_status || {};
      Object.keys(vs).forEach(key => {
        if (vs[key] === "verified" || vs[key] === "applied" || vs[key] === "waived") {
          base[key] = vs[key];
        }
      });
    } else if (style === "stay_throughout" && Array.isArray(currentEvent.checkpoints)) {
      // Find the most recent started checkpoint (irrespective of if it has ended)
      const lastStartedCp = [...currentEvent.checkpoints]
        .reverse()
        .find((cp: any) => now >= (cp.start ?? cp.scheduled_time));

      if (lastStartedCp?.verification_status) {
        const vs = lastStartedCp.verification_status;
        Object.keys(vs).forEach(key => {
          // Successes are reflected, failures are left as 'neutral' (from base cleanup above)
          if (vs[key] === "verified") {
            base[key] = "verified";
          }
        });
      }
    } else if (Array.isArray(currentEvent.conditions)) {
      currentEvent.conditions.forEach((c: any) => {
        if (c.metric_key && (c.status === "verified" || c.status === "applied" || c.status === "waived")) {
          base[c.metric_key] = c.status;
        }
      });
    }

    return base;
  }, [currentEvent, conditionStatuses]);

  // Seed local condition statuses from live data
  useEffect(() => {
    if (!isVisible) {
      setConditionStatuses({});
      setSeededTaskId(null);
      return;
    }
    if (currentEvent && selectedTaskId !== seededTaskId) {
      const initial: Record<string, string> = {};
      
      if (Array.isArray(currentEvent.conditions)) {
        currentEvent.conditions.forEach((c: any) => {
          if (c.metric_key) {
             // Convert any 'failed' status to 'neutral' to ensure interactive retries
             initial[c.metric_key] = (c.status === "failed") ? "neutral" : c.status;
          }
        });
      }
      
      setConditionStatuses(initial);
      setSeededTaskId(selectedTaskId);
    }
  }, [isVisible, currentEvent, selectedTaskId, seededTaskId]);

  // 5. ORCHESTRATED ACTIONS

  const handleVerifyCondition = useCallback(async (metricKey: string, evidence?: any) => {
    if (!currentEvent?._id || verifyingMetric) return;
    setVerifyingMetric(metricKey);

    try {
      Logger.info(`[Verify] Calling Convex verify for ${currentEvent._id} (${metricKey})`);
      const result = await verifyMutation({
        instanceId: currentEvent._id as any,
        metricKey,
        evidence,
      }) as any;

      Logger.info(`[Verify] Result:`, result);

      if (result.success) {
        setConditionStatuses((p) => ({ ...p, [metricKey]: result.status }));
      } else {
        // Show the failure reason from the backend in the modal title only
        setFailureModal({
          visible: true,
          title: result.message || "Verification condition not met.",
          message: "",
        });
      }
    } catch (err: any) {
      Logger.error(`[Verify] Error for ${currentEvent._id}`, err);
      setFailureModal({
        visible: true,
        title: parseError(err),
        message: "",
      });
    } finally {
      setVerifyingMetric(null);
    }
  }, [currentEvent, verifyingMetric, verifyMutation]);

  const confirmDelete = useCallback(async () => {
    if (!currentEvent?._id) return;
    setIsDeleting(true);

    const handleStrictError = () => {
       const strictUntil = currentEvent?.strict_until;
       let lockedTime = 'its end time';
       if (strictUntil) {
           const d = new Date(strictUntil);
           const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
           const h = d.getHours() % 12 || 12;
           const mn = d.getMinutes().toString().padStart(2, '0');
           const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
           lockedTime = `${h}:${mn} ${ampm}, ${m} ${d.getDate()}`;
       }
       setFailureModal({ visible: true, title: `Vault is Active.\nCannot be deleted until ${lockedTime}.`, message: '' });
    };

    try {
      const result = await deleteInstance(currentEvent._id);
      if (result.success) {
        setDeleteConfirmVisible(false);
        handleClose();
      } else {
        if (String((result as any).error).includes('STRICT_LOCK_ACTIVE')) {
            handleStrictError();
        } else {
            setFailureModal({ visible: true, title: (result as any).error || "Action Refused", message: '' });
        }
      }
    } catch (err: any) {
      if (String(err?.message || err).includes('STRICT_LOCK_ACTIVE')) {
          handleStrictError();
      } else {
          setFailureModal({ visible: true, title: parseError(err), message: '' });
      }
    } finally {
      setIsDeleting(false);
    }
  }, [currentEvent, deleteInstance, handleClose]);

  const handleStartWaiver = useCallback(async () => {
    if (!currentEvent?._id) return;
    setIsStartingWaiver(true);

    const context = { instanceId: currentEvent._id };
    const orchestrator = new TripleWriteOrchestrator(context);

    orchestrator
      .addStep("Cloud Waiver Initiation", async (ctx) => {
          Logger.info(`[WaiverSaga] Step 1: Initiating waiver session on Convex for ${ctx.instanceId}`);
          const result = await startWaiverMutation({ instanceId: ctx.instanceId }) as any;
          if (result && result.success === false) {
             throw new Error(result.message || "Waiver initiation refused by server.");
          }
          return result;
      })
      .addStep("Local Sync (Hardware Update)", async () => {
          Logger.info(`[WaiverSaga] Step 2: Recalculating hardware alarms under SyncLock`);
          await syncLock.execute("Saga:Waiver", async () => {
            scheduleNextAlarm();
          });
      });

    try {
      const exec = await orchestrator.execute();
      if (exec.success) {
        setWaiverConfirmVisible(false);
        setWaiverModalVisible(true);
      } else {
        setWaiverConfirmVisible(false);
        setFailureModal({
          visible: true,
          title: exec.error || "Waiver Sync Failed",
          message: "",
        });
      }
    } catch (err: any) {
      Logger.error(`[WaiverSaga] CRITICAL FAILURE for ${currentEvent._id}`, err);
      setFailureModal({
        visible: true,
        title: parseError(err),
        message: "",
      });
    } finally {
      setIsStartingWaiver(false);
    }
  }, [currentEvent, startWaiverMutation, db]);

  const handleActivateStrict = useCallback(async () => {
    if (!currentEvent?._id) return;
    setIsLocking(true);
    
    const STRICT_MODE_BUFFER_MS = 30000;
    const strictUntilWithBuffer = currentEvent.end + STRICT_MODE_BUFFER_MS;
    
    const context = { instanceId: currentEvent._id, strictUntil: strictUntilWithBuffer };
    const orchestrator = new TripleWriteOrchestrator(context);

    orchestrator
      .addStep("Cloud Lock", async (ctx) => {
          /**
           * DISTRIBUTED SYSTEMS PATTERN: Lease Extension
           * The 30s buffer ensures Convex has adequate time to independently execute
           * the 'runVerification' heartbeat before the UI officially un-freezes.
           */
          await updateInstanceMutation({ id: ctx.instanceId as any, strict_until: ctx.strictUntil, is_manual_edit: true });
      })
      .addStep("Local Sync (Disk + Hardware)", async (ctx) => {
          await syncLock.execute("Saga:StrictMode", async () => {
            await updateInstanceInLocalDb(db, ctx.instanceId, { strict_until: ctx.strictUntil, is_manual_edit: true });
            scheduleNextAlarm();
          });
      });

    try {
      const exec = await orchestrator.execute();
      if (exec.success) {
        setStrictConfirmVisible(false);
      } else {
        setFailureModal({ visible: true, title: exec.error || "Lock Refused", message: '' });
      }
    } catch (err) {
      setFailureModal({ visible: true, title: parseError(err), message: '' });
    } finally {
      setIsLocking(false);
    }
  }, [currentEvent, updateInstanceMutation, db]);

  const handleEditTask = useCallback(() => {
    if (currentEvent) {
      resetDraft();
      setDraft({ ...currentEvent, id: currentEvent.task_id });
      handleClose();
      router.push("/(create-commit)/final");
    }
  }, [currentEvent, resetDraft, setDraft, handleClose, router]);

  const handleDuplicate = useCallback(() => {
    if (currentEvent) {
      resetDraft();
      setDraft({ ...currentEvent, _id: undefined, id: undefined });
      handleClose();
      router.push("/(create-commit)/final");
    }
  }, [currentEvent, resetDraft, setDraft, handleClose, router]);

  const handleOpenMenu = useCallback((pos: { x: number; y: number }) => {
    setMenuPosition(pos);
    setMenuVisible(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  // 6. ACTION MENU CONFIGURATION
  const actionMenuItems: ActionMenuItem[] = useMemo(() => [
    { icon: "delete-outline", label: "Delete", color: "#FF3B30", onPress: () => setDeleteConfirmVisible(true) },
    { icon: "lock-outline", label: "Strict Mode", onPress: () => { setMenuVisible(false); setStrictConfirmVisible(true); } },
    { icon: "content-copy", label: "Duplicate", onPress: handleDuplicate },
    { icon: "help-circle-outline", label: "Help", onPress: () => { setMenuVisible(false); console.log("[ActionMenu] Help requested"); } }
  ], [handleDuplicate]);

  // 7. EXPORT
  return {
    currentEvent,
    isVisible,
    displayStatus,
    scrollEnabled,
    setScrollEnabled,
    conditionStatuses: resolvedConditionStatuses,
    verifyingMetric,
    handleVerifyCondition,
    menuVisible,
    menuPosition,
    actionMenuItems,
    handleOpenMenu,
    closeMenu,
    handleClose,
    handleEditTask,
    handleDuplicate,
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
    handleStatusPress: (metricKey: string) => {
      if (!currentEvent) return;
      const style = currentEvent.config?.verification_style;
      const now = Date.now();
      
      let relevantCp = null;
      if (style === "just_show_up" && currentEvent.checkpoints?.[0]) {
        relevantCp = currentEvent.checkpoints[0];
      } else if (style === "stay_throughout" && currentEvent.checkpoints) {
        relevantCp = [...currentEvent.checkpoints]
          .reverse()
          .find((cp: any) => now >= (cp.start ?? cp.scheduled_time));
      }

      if (relevantCp) {
        const vs = relevantCp.verification_status || {};
        if (vs[metricKey] === 'failed') {
          // Check for specific reason in metadata, then fallback to general cp reason
          const meta = relevantCp.vs_metadata?.[metricKey] || {};
          const reason = meta.failure_reason || relevantCp.failure_reason || "Verification condition not met.";
          setFailureModal({
            visible: true,
            title: reason,
            message: ""
          });
        }
      }
    },
  };
}
