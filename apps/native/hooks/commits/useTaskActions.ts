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

  const deleteTask = useCallback(async (taskId: string) => {
    // 1. Authoritative Cloud Delete
    // This removes the commitment definition and clears the server-side temporal brain.
    await removeTaskMutation({ id: taskId as any });

    // 2. Local Cache Cleanup (SQLite)
    // We wipe instances first to satisfy any lingering foreign key constraints (even if PRAGMA is off)
    try {
      await db.runAsync('DELETE FROM task_instances WHERE task_id IN (SELECT id FROM local_tasks WHERE convex_id = ?)', [taskId]);
      await db.runAsync('DELETE FROM local_tasks WHERE convex_id = ?', [taskId]);
      console.log('[useTaskActions] Local DB cleanup complete for:', taskId);
    } catch (localError) {
      console.error('[useTaskActions] Local DB delete failed (non-critical):', localError);
    }

    // 3. Hardware Alarm Sync
    // CRITICAL: We re-trigger the scheduler AFTER local deletion to ensure
    // it sees the updated database state when finding the next upcoming alarm.
    try {
      scheduleNextAlarm();
      console.log('[useTaskActions] Native alarms refreshed post-deletion sequence');
    } catch (e) {
      console.error('[useTaskActions] Native alarm refresh failed:', e);
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
  const deleteInstance = useCallback(async (instanceConvexId: string) => {
    // 1. Authoritative Cloud Delete
    await removeInstanceMutation({ id: instanceConvexId as any });

    // 2. Local Cache Cleanup
    try {
      await db.runAsync('DELETE FROM task_instances WHERE convex_id = ?', [instanceConvexId]);
      console.log('[useTaskActions] Local SQLite instance deleted:', instanceConvexId);
    } catch (e) {
      console.error('[useTaskActions] SQLite instance delete failed:', e);
    }

    // 3. Hardware Alarm Sync
    try {
      scheduleNextAlarm();
      console.log('[useTaskActions] Native alarms refreshed after instance deletion');
    } catch (e) {
      console.error('[useTaskActions] Native alarm refresh failed:', e);
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
