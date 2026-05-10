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
import { syncLock } from "@/lib/sync-lock";
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
  const { startHealing, stopHealing, triggerCrash } = useHealStore();
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

  /**
   * @saga    TASK_ERADICATION_ORCHESTRATOR
   * @desc    Performs a Cloud-First scorched-earth deletion of a parent commitment and all its dependencies.
   * @access  Public (from delete confirm)
   *
   * Flow:
   * 1. Cloud Eradication: Mark task as deleted in Convex.
   * 2. Forward-Heal Loop (Step 1 Compensation):
   *    - If cloud succeeds but device fails, enter blocking retry loop.
   *    - Perform unified audit/wipe of local SQL rows (ghost prevention).
   *    - Force-ingest fresh Delta Payload.
   *    - Realign Hardware Alarms.
   * 3. Disk Sync: Secondary local cleanup of auxiliary tables.
   * 4. Hardware Sync: Final alarm system refresh.
   *
   * Note:
   * - This is an Imperial Saga; once Cloud succeeds, the local device MUST follow.
   * - Unified wipe targets unified Convex IDs, preventing orphaned alarms.
   */
  const deleteTask = useCallback(async (taskId: string): Promise<{ success: boolean; error: string | null }> => {
    /**
     * TASK DELETION SAGA
     * Deleting a task is destructive. We must ensure the hardware alarm is
     * cleared before we let the UI hide the task from the user.
     */
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

              /**
               * SYNC LOCK ACQUISITION (HEAL LOOP)
               * 
               * We must lock the DB here to prevent the Background Engine
               * from running its own ingestion at the exact same millisecond.
               */
              await syncLock.execute("Saga:DeleteTask:Heal", async () => {
                // 1. Manually Eradicate locally (The most direct path to consistency)
                await db.withTransactionAsync(async () => {
                  await db.runAsync('DELETE FROM task_instances WHERE task_id = ?', [ctx.taskId]);
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
              });
              
              Logger.info(`[TaskSaga] Fixed Forward-Heal successful for ${ctx.taskId} on attempt ${attempts}`);
              break;

            } catch (error: any) {
              Logger.error(`[TaskSaga] Heal attempt ${attempts} failed:`, error);
              if (String(error).includes('ERR_ACCESS_CLOSED_RESOURCE') || attempts >= 15) {
                Logger.error(`[TaskSaga] Zombie handle or max attempts reached. Forcing reset.`);
                triggerCrash("A persistent synchronization issue was detected. The app will now safely restart to recover.");
                break;
              }
              await new Promise(r => setTimeout(r, 2000));
            }
          }
          
          stopHealing();
        }
      )
      .addStep(
        "Local Sync (Disk + Hardware)",
        async (ctx) => {
          Logger.info(`[TaskSaga] Step 2: SQLite Disk Eradication & Hardware Sync for ${ctx.taskId}`);
          if (__DEV__ && useChaosStore.getState().faultDiskWrite) throw new Error("[CHAOS] SQLite delete failed.");
          if (__DEV__ && useChaosStore.getState().faultHardware) throw new Error("[CHAOS] Android failed to clear alarm.");
          
          /**
           * SYNC LOCK ACQUISITION (MAIN SAGA)
           * 
           * CRITICAL MERGE: We combine the SQLite Delete and the Kotlin 
           * Alarm trigger into a SINGLE Locked operation to prevent "Phantom Overwrite".
           */
          await syncLock.execute("Saga:DeleteTask", async () => {
            await db.withTransactionAsync(async () => {
              // Nuke all auto-generated entities, but preserve manually edited ones.
              await db.runAsync('DELETE FROM task_instances WHERE task_id = ?', [ctx.taskId]);
              await db.runAsync('DELETE FROM local_tasks WHERE id = ?', [ctx.taskId]);
              await db.runAsync('DELETE FROM local_tasks WHERE convex_id = ?', [ctx.taskId]); // Double-tap for legacy rows
              Logger.info(`[TaskSaga] Unified Disk Eradication complete for ${ctx.taskId}`);
            });
            
            scheduleNextAlarm();
          });

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
  /**
   * @saga    INSTANCE_ERADICATION_ORCHESTRATOR
   * @desc    Surgically removes a single temporal occurrence of a task from the calendar.
   * @access  Public (from instance detail modal)
   *
   * Flow:
   * 1. Cloud Instance Eradication: Delete specific taskInstance ID in Convex.
   * 2. Forward-Heal Loop (Step 1 Compensation):
   *    - Enter blocking retry loop on device failure.
   *    - Manually purge the specific instance ID from SQLite.
   *    - Ingest Delta Payload to ensure zero drift.
   *    - Refresh Local Hardware Alarms.
   * 3. Disk Sync: SQLite instance cache cleanup.
   * 4. Hardware Sync: Individual alarm removal synchronization.
   *
   * Note:
   * - Strictly uses the unified Convex ID for the "Surgical Wipe".
   * - Prevents individual ghost events if cellular/database connection is flaky.
   */
  const deleteInstance = useCallback(async (instanceConvexId: string): Promise<{ success: boolean; error: string | null }> => {
    /**
     * INSTANCE DELETION SAGA
     * Even an individual instance deletion must be guaranteed by the hardware.
     */
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
        async (ctx) => {
          Logger.warn(`[InstanceSaga] FORWARD-HEAL triggered for instance deletion of: ${ctx.instanceConvexId}`);
          startHealing("Synchronizing device after instance removal...");
          
          let attempts = 0;
          while (true) {
            try {
              attempts++;
              if (attempts > 1) {
                startHealing(`Retrying instance deletion sync (Attempt ${attempts})...`);
              }

              /**
               * SYNC LOCK ACQUISITION (HEAL LOOP)
               */
              await syncLock.execute("Saga:DeleteInstance:Heal", async () => {
                // 1. Manually Eradicate locally 
                await db.runAsync('DELETE FROM task_instances WHERE convex_id = ?', [ctx.instanceConvexId]);

                // 2. Sync Delta (Fallback repair)
                const token = await getLocalSyncToken();
                const payload = await convex.query(api.api.sync.delta.getDeltaPayload, { 
                  last_synced_at: token || undefined 
                });
                await ingestDeltaPayload(db, payload);

                // 3. Hardware Sync 
                scheduleNextAlarm();
              });
              
              Logger.info(`[InstanceSaga] Fixed Forward-Heal successful for instance ${ctx.instanceConvexId} on attempt ${attempts}`);
              break;

            } catch (error: any) {
              Logger.error(`[InstanceSaga] Instance heal attempt ${attempts} failed:`, error);
              if (String(error).includes('ERR_ACCESS_CLOSED_RESOURCE') || attempts >= 15) {
                Logger.error(`[InstanceSaga] Zombie handle or max attempts reached. Forcing reset.`);
                triggerCrash("A persistent synchronization issue was detected. The app will now safely restart to recover.");
                break;
              }
              await new Promise(r => setTimeout(r, 2000));
            }
          }
          
          stopHealing();
        }
      )
      .addStep(
        "Local Sync (Disk + Hardware)",
        async (ctx) => {
          Logger.info(`[InstanceSaga] Step 2: SQLite Disk Eradication & Hardware Sync for ${ctx.instanceConvexId}`);
          if (__DEV__ && useChaosStore.getState().faultDiskWrite) throw new Error("[CHAOS] SQLite delete failed.");
          if (__DEV__ && useChaosStore.getState().faultHardware) throw new Error("[CHAOS] Android failed to clear individual alarm.");

          /**
           * SYNC LOCK ACQUISITION (MAIN SAGA)
           */
          await syncLock.execute("Saga:DeleteInstance", async () => {
            await db.runAsync('DELETE FROM task_instances WHERE convex_id = ?', [ctx.instanceConvexId]);
            scheduleNextAlarm();
          });

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
