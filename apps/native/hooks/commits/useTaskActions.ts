import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { useSQLiteContext } from 'expo-sqlite';
import { api } from '@commit/backend/convex/_generated/api';
import { useTaskDraftStore } from '@/stores/useTaskDraftStore';
import { scheduleNextAlarm } from '@/modules/scheduler-module';
import { TripleWriteOrchestrator } from "@/lib/triple-write-orchestrator";
import { useChaosStore } from "@/stores/useChaosStore";
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
          if (__DEV__ && useChaosStore.getState().faultCloudWrite) throw new Error("[CHAOS] Convex delete failed.");
          const result = await removeTaskMutation({ id: ctx.taskId as any });
          return { originalResult: result };
        },
        async () => {
          // COMPENSATING: A 'Delete Rollback' is technically a 'Re-Create', but since 
          // the source data is gone from the cloud, we rely on the Auto-Heal engine 
          // (HydrationSync) to catch this Split-Brain state and restore the record.
        }
      )
      .addStep(
        "Disk Eradication (SQLite Cache)",
        async (ctx) => {
          if (__DEV__ && useChaosStore.getState().faultDiskWrite) throw new Error("[CHAOS] SQLite delete failed.");
          
          // V12 INSTANCE-DEPENDENT ARCHITECTURE:
          // No PRAGMA foreign_keys toggle needed. The schema has zero FK constraints,
          // so deleting the parent task while manually-edited child instances survive
          // is natively supported without any connection-state gymnastics.
          await db.withTransactionAsync(async () => {
            const taskRow = await db.getFirstAsync<{ id: string }>(
              'SELECT id FROM local_tasks WHERE convex_id = ?',
              [ctx.taskId]
            );

            if (taskRow) {
              const localTaskId = taskRow.id;
              // Delete non-manual instances (manual-edit instances survive as orphans)
              await db.runAsync('DELETE FROM task_instances WHERE task_id = ? AND is_manual_edit = 0', [localTaskId]);
              // Delete parent task — orphaned instances are valid in V12
              await db.runAsync('DELETE FROM local_tasks WHERE id = ?', [localTaskId]);
            }
          });
        }
      )
      .addStep(
        "Hardware Sync (Clear Alarms)",
        async () => {
          if (__DEV__ && useChaosStore.getState().faultHardware) throw new Error("[CHAOS] Android failed to clear alarm.");
          scheduleNextAlarm();
        }
      );

    try {
        const execution = await orchestrator.execute();
        return { success: execution.success, error: execution.error };
    } catch (e: any) {
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
          if (__DEV__ && useChaosStore.getState().faultDiskWrite) throw new Error("[CHAOS] SQLite delete failed.");
          await db.runAsync('DELETE FROM task_instances WHERE convex_id = ?', [ctx.instanceConvexId]);
        }
      )
      .addStep(
        "Hardware Sync (Clear Instance Alarm)",
        async () => {
          if (__DEV__ && useChaosStore.getState().faultHardware) throw new Error("[CHAOS] Android failed to clear individual alarm.");
          scheduleNextAlarm();
        }
      );

    try {
        const execution = await orchestrator.execute();
        return { success: execution.success, error: execution.error };
    } catch (e: any) {
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
