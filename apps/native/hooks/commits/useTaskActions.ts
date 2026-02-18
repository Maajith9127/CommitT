import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { useSQLiteContext } from 'expo-sqlite';
import { api } from '@commit/backend/convex/_generated/api';
import { useTaskDraftStore } from '@/stores/useTaskDraftStore';
import { cancelForTask } from '@/modules/scheduler-module';
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
    // Cancel any active scheduling chain for this task
    try {
      cancelForTask(taskId);
      console.log('[useTaskActions] Cancelled schedule chain for:', taskId);
    } catch (schedError) {
      console.error('[useTaskActions] Cancel schedule failed (non-critical):', schedError);
    }

    // Delete from Convex
    await removeTaskMutation({ id: taskId as any });

    // Delete from local DB
    try {
      await db.runAsync('DELETE FROM local_tasks WHERE convex_id = ?', [taskId]);
      console.log('[useTaskActions] Local DB delete OK for:', taskId);
    } catch (localError) {
      console.error('[useTaskActions] Local DB delete failed (non-critical):', localError);
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
