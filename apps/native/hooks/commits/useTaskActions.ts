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
    // NOTE: Convex's `cleanupFuture` already preserves `is_manual_edit` instances server-side.
    await removeTaskMutation({ id: taskId as any });

    // 2. Local Cache Cleanup (SQLite)
    // ─────────────────────────────────────────────────────────────────────
    // CRITICAL EDGE CASE: ON DELETE CASCADE would nuke ALL child instances,
    // including manually edited ones the user customized. We handle this
    // surgically to match the Convex backend's `cleanupFuture` behavior.
    // ─────────────────────────────────────────────────────────────────────
    try {
      // Step A: Find the local task ID from the Convex ID
      const taskRow = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM local_tasks WHERE convex_id = ?',
        [taskId]
      );

      if (taskRow) {
        const localTaskId = taskRow.id;

        // Step B: Delete all instances that are NOT manually edited
        // This preserves drag-and-drop rescheduled instances as historical proof.
        await db.runAsync(
          'DELETE FROM task_instances WHERE task_id = ? AND is_manual_edit = 0',
          [localTaskId]
        );

        // Step C: Orphan any surviving edited instances so CASCADE doesn't kill them.
        // We temporarily disable foreign keys, delete the parent, then re-enable.
        await db.execAsync('PRAGMA foreign_keys = OFF;');
        await db.runAsync('DELETE FROM local_tasks WHERE id = ?', [localTaskId]);
        await db.execAsync('PRAGMA foreign_keys = ON;');

        console.log('[useTaskActions] Local DB cleanup complete. Edited instances preserved for:', taskId);
      }
    } catch (localError) {
      console.error('[useTaskActions] Local DB delete failed (non-critical):', localError);
      // Failsafe: re-enable foreign keys even if something breaks
      try { await db.execAsync('PRAGMA foreign_keys = ON;'); } catch (_) {}
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
