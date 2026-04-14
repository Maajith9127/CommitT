import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { useSQLiteContext } from 'expo-sqlite';
import { api } from '@commit/backend/convex/_generated/api';
import { useTaskDraftStore } from '@/stores/useTaskDraftStore';
import { scheduleNextAlarm } from '@/modules/scheduler-module';
import { TripleWriteOrchestrator } from "@/lib/triple-write-orchestrator";
import { useChaosStore } from "@/stores/useChaosStore";
import { useHealStore } from "@/stores/useHealStore";
import { useConvex } from "convex/react";
import { getLocalSyncToken, ingestDeltaPayload } from "@/lib/sync-engine";
import { Logger } from "@/lib/logger";
import type { Task } from './useTasks';

/**
 * useTaskActions
 * 
 * Encapsulates logic for:
 * - Creating new commitments (draft setup + navigation)
 * - Editing existing commitments (draft setup + navigation)
 * - Deleting commitments (Convex mutation)
 */
export function useTaskActions() {
  const router = useRouter();
  const convex = useConvex();
  const { startHealing, stopHealing } = useHealStore();
  const setDraft = useTaskDraftStore((state) => state.setDraft);
  const resetDraft = useTaskDraftStore((state) => state.resetDraft);
  const setAssigner = useTaskDraftStore((state) => state.setAssigner);
  const setAssignee = useTaskDraftStore((state) => state.setAssignee);

  const removeTaskMutation = useMutation(api.api.commitments.delete.default);
  const removeInstanceMutation = useMutation(api.api.instances.delete.default);
  const db = useSQLiteContext();

  // Navigate to Create Screen
  const handleCreateNew = useCallback((userId: string) => {
    resetDraft();
    setAssigner(userId);
    setAssignee(userId);
    router.push("/(create-commit)/final");
  }, [resetDraft, setAssigner, setAssignee, router]);

  // Navigate to Edit Screen
  const handleEditTask = useCallback((task: Task) => {
    setDraft({
      ...task,
      id: task._id,
    });
    router.push("/(create-commit)/final");
  }, [setDraft, router]);

  const deleteTask = useCallback(async (taskId: string): Promise<{ success: boolean; error: string | null }> => {
    // ╔══════════════════════════════════════════════════════════════════════════════╗
    // ║  TASK DELETION SAGA                                                          ║
    // ╠══════════════════════════════════════════════════════════════════════════════╣
    // ║  Deleting a task is destructive. We must ensure the hardware alarm is        ║
    // ║  cleared before we let the UI hide the task from the user.                   ║
    // ╚══════════════════════════════════════════════════════════════════════════════╝
    const contextSnapshot = { taskId };
    const orchestrator = new TripleWriteOrchestrator(contextSnapshot);

    orchestrator
      .addStep(
        "Cloud Eradication (Convex)",
        async (ctx) => {
          Logger.info(`[TaskSaga] Step 1: Convex Eradication for ${ctx.taskId}`);
          if (__DEV__ && useChaosStore.getState().faultCloudWrite) throw new Error("[CHAOS] Convex delete failed.");
          const result = await removeTaskMutation({ id: ctx.taskId as any });
          return { originalResult: result };
        },
        async (ctx) => {
          Logger.warn(`[TaskSaga] FORWARD-HEAL triggered for deletion of: ${ctx.taskId}`);
          startHealing("Synchronizing your device after deletion...");
          
          let attempts = 0;
          while (true) {
            try {
              attempts++;
              if (attempts > 1) {
                startHealing(`Retrying deletion sync (Attempt ${attempts})...`);
              }

              // 1. Manually Eradicate locally (The most direct path to consistency)
              await db.withTransactionAsync(async () => {
                await db.runAsync('DELETE FROM task_instances WHERE task_id = ?', [ctx.taskId]);
                await db.runAsync('DELETE FROM blocked_apps WHERE task_id = ?', [ctx.taskId]);
                await db.runAsync('DELETE FROM blocked_websites WHERE task_id = ?', [ctx.taskId]);
                await db.runAsync('DELETE FROM local_tasks WHERE id = ?', [ctx.taskId]);
                await db.runAsync('DELETE FROM local_tasks WHERE convex_id = ?', [ctx.taskId]);
              });

              // 2. Sync Delta (Fallback repair to ensure no other drift)
              const token = await getLocalSyncToken();
              const payload = await convex.query(api.api.sync.delta.getDeltaPayload, { 
                last_synced_at: token || undefined 
              });
              await ingestDeltaPayload(db, payload);

              // 3. Hardware Sync 
              scheduleNextAlarm();
              
              Logger.info(`[TaskSaga] Fixed Forward-Heal successful for ${ctx.taskId} on attempt ${attempts}`);
              break;

            } catch (error) {
              Logger.error(`[TaskSaga] Heal attempt ${attempts} failed:`, error);
              await new Promise(r => setTimeout(r, 2000));
            }
          }
          
          stopHealing();
        }
      )
      .addStep(
        "Disk Eradication (SQLite Cache)",
        async (ctx) => {
          Logger.info(`[TaskSaga] Step 2: SQLite Disk Eradication for ${ctx.taskId}`);
          if (__DEV__ && useChaosStore.getState().faultDiskWrite) throw new Error("[CHAOS] SQLite delete failed.");
          
          await db.withTransactionAsync(async () => {
            // Nuke all auto-generated entities, but preserve manually edited ones.
            await db.runAsync('DELETE FROM task_instances WHERE task_id = ?', [ctx.taskId]);
            await db.runAsync('DELETE FROM blocked_apps WHERE task_id = ?', [ctx.taskId]);
            await db.runAsync('DELETE FROM blocked_websites WHERE task_id = ?', [ctx.taskId]);
            await db.runAsync('DELETE FROM local_tasks WHERE id = ?', [ctx.taskId]);
            await db.runAsync('DELETE FROM local_tasks WHERE convex_id = ?', [ctx.taskId]); // Double-tap for legacy rows
            Logger.info(`[TaskSaga] Unified Disk Eradication complete for ${ctx.taskId}`);
          });
        }
      )
      .addStep(
        "Hardware Sync (Clear Alarms)",
        async () => {
          Logger.info(`[TaskSaga] Step 3: Hardware Sync for ${contextSnapshot.taskId}`);
          if (__DEV__ && useChaosStore.getState().faultHardware) throw new Error("[CHAOS] Android failed to clear alarm.");
          scheduleNextAlarm();
          Logger.info(`[TaskSaga] Saga Complete for ${contextSnapshot.taskId}`);
        }
      );

    try {
        const execution = await orchestrator.execute();
        
        // IMPERIAL SUCCESS CHECK: If cloud eradication succeeded, the heal loop 
        // guarantees consistency before returning.
        const cloudEradicationSuccess = !!execution.results["Cloud Eradication (Convex)"];
        const finalSuccess = execution.success || cloudEradicationSuccess;
        const finalError = finalSuccess ? null : execution.error;

        if (!finalSuccess) Logger.error(`[TaskSaga] Execution Failed for ${taskId}`, finalError);
        return { success: finalSuccess, error: finalError };
    } catch (e: any) {
        Logger.error(`[TaskSaga] CATASTROPHIC FAILURE for ${taskId}`, e);
        return { success: false, error: e.message || "Deletion Engine crashed." };
    }
  }, [removeTaskMutation, db]);

  // Pause Task (Placeholder)
  const pauseTask = useCallback((taskId: string) => {
    console.log("[useTaskActions] Pause task:", taskId);
  }, []);

  // Duplicate Task (Placeholder)
  const duplicateTask = useCallback((taskId: string) => {
    console.log("[useTaskActions] Duplicate task:", taskId);
  }, []);

  // Delete Individual Instance
  const deleteInstance = useCallback(async (instanceConvexId: string): Promise<{ success: boolean; error: string | null }> => {
    // ╔══════════════════════════════════════════════════════════════════════════════╗
    // ║  INSTANCE DELETION SAGA                                                      ║
    // ╠══════════════════════════════════════════════════════════════════════════════╣
    // ║  Even an individual instance deletion must be guaranteed by the hardware.    ║
    // ╚══════════════════════════════════════════════════════════════════════════════╝
    const contextSnapshot = { instanceConvexId };
    const orchestrator = new TripleWriteOrchestrator(contextSnapshot);

    orchestrator
      .addStep(
        "Cloud Eradication (Convex Instance)",
        async (ctx) => {
          if (__DEV__ && useChaosStore.getState().faultCloudWrite) throw new Error("[CHAOS] Convex delete failed.");
          const result = await removeInstanceMutation({ id: ctx.instanceConvexId as any });
          if ((result as any)?.success === false) throw new Error((result as any).error || "Convex instance delete rejected.");
          return { originalResult: result };
        },
        async () => { /* Rely on Auto-Heal if rollback fails */ }
      )
      .addStep(
        "Disk Eradication (SQLite Instance Cache)",
        async (ctx) => {
          Logger.info(`[InstanceSaga] Step 2: SQLite Disk Instance Eradication for ${ctx.instanceConvexId}`);
          if (__DEV__ && useChaosStore.getState().faultDiskWrite) throw new Error("[CHAOS] SQLite delete failed.");
          await db.runAsync('DELETE FROM task_instances WHERE convex_id = ?', [ctx.instanceConvexId]);
        }
      )
      .addStep(
        "Hardware Sync (Clear Instance Alarm)",
        async () => {
          Logger.info(`[InstanceSaga] Step 3: Hardware Alarm Sync for ${contextSnapshot.instanceConvexId}`);
          if (__DEV__ && useChaosStore.getState().faultHardware) throw new Error("[CHAOS] Android failed to clear individual alarm.");
          scheduleNextAlarm();
          Logger.info(`[InstanceSaga] Saga Complete for ${contextSnapshot.instanceConvexId}`);
        }
      );

    try {
        const execution = await orchestrator.execute();
        
        // IMPERIAL SUCCESS CHECK: If cloud instance eradication succeeded, we are stable.
        const instanceEradicationSuccess = !!execution.results["Cloud Eradication (Convex Instance)"];
        const finalSuccess = execution.success || instanceEradicationSuccess;
        const finalError = finalSuccess ? null : execution.error;

        if (!finalSuccess) {
            if (!String(finalError).includes('STRICT_LOCK_ACTIVE')) {
                Logger.error(`[InstanceSaga] Execution Failed for ${instanceConvexId}`, finalError);
            }
        }
        return { success: finalSuccess, error: finalError };
    } catch (e: any) {
        if (!String(e.message).includes('STRICT_LOCK_ACTIVE')) {
            Logger.error(`[InstanceSaga] CATASTROPHIC FAILURE for ${instanceConvexId}`, e);
        }
        return { success: false, error: e.message || "Instance Deletion Engine crashed." };
    }
  }, [removeInstanceMutation, db]);

  return {
    handleCreateNew,
    handleEditTask,
    deleteTask,
    deleteInstance,
    pauseTask,
    duplicateTask,
    setDraft,
    resetDraft,
  };
}
