import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { useSQLiteContext } from 'expo-sqlite';
import { api } from '@commit/backend/convex/_generated/api';
import { useTaskDraftStore } from '@/stores/useTaskDraftStore';
import { scheduleNextAlarm } from '@/modules/scheduler-module';
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

  const deleteTask = useCallback(async (taskId: string) => {
    // Delete task instances from local DB before we tell native to schedule next
    try {
      // Explicitly delete instances first to be 100% safe (even if PRAGMA foreign_keys is off)
      await db.runAsync('DELETE FROM task_instances WHERE task_id IN (SELECT id FROM local_tasks WHERE convex_id = ?)', [taskId]);
      await db.runAsync('DELETE FROM local_tasks WHERE convex_id = ?', [taskId]);
      console.log('[useTaskActions] Local DB delete OK for:', taskId);
      
      // Now re-trigger the scheduler to process the deletion
      try {
        scheduleNextAlarm();
        console.log('[useTaskActions] Scheduled globally next alarm after deletion');
      } catch (schedError) {
        console.error('[useTaskActions] scheduling fallback failed', schedError);
      }
    } catch (localError) {
      console.error('[useTaskActions] Local DB delete failed (non-critical):', localError);
    }

    // Use the convex mutation as the final step (it operates in the background via useMutation hook)
    await removeTaskMutation({ id: taskId as any });
  }, [removeTaskMutation, db]);

  // Pause Task (Placeholder)
  const pauseTask = useCallback((taskId: string) => {
    console.log("[useTaskActions] Pause task:", taskId);
  }, []);

  // Duplicate Task (Placeholder)
  const duplicateTask = useCallback((taskId: string) => {
    console.log("[useTaskActions] Duplicate task:", taskId);
  }, []);

  return {
    handleCreateNew,
    handleEditTask,
    deleteTask,
    pauseTask,
    duplicateTask,
    setDraft,
    resetDraft,
  };
}
