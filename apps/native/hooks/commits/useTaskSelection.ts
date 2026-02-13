import { useState, useCallback } from 'react';
import type { Task } from './useTasks';

export interface AnchorPosition {
  x: number;
  y: number;
}

/**
 * useTaskSelection
 * 
 * Manages UI state for interacting with a specific task:
 * - Action Menu visibility & position
 * - Delete Confirmation Modal visibility
 * - Currently selected task
 */
export function useTaskSelection() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState<AnchorPosition>({ x: 0, y: 0 });
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Open Action Menu
  const openMenu = useCallback((task: Task, position: AnchorPosition) => {
    setSelectedTask(task);
    setMenuPosition(position);
    setMenuVisible(true);
  }, []);

  // Close Action Menu
  const closeMenu = useCallback(() => {
    setMenuVisible(false);
    // Don't clear selectedTask yet if we might need it for a modal (like delete)
  }, []);

  // Open Delete Modal
  const requestDelete = useCallback(() => {
    setMenuVisible(false);
    setDeleteModalVisible(true);
  }, []);

  // Close Delete Modal
  const cancelDelete = useCallback(() => {
    setDeleteModalVisible(false);
    // Now safe to clear selection
    // setSelectedTask(null); // Optional: keep selected until action completes?
  }, []);

  // Reset all selection state
  const clearSelection = useCallback(() => {
    setMenuVisible(false);
    setDeleteModalVisible(false);
    setSelectedTask(null);
  }, []);

  return {
    selectedTask,
    menuVisible,
    menuPosition,
    deleteModalVisible,
    openMenu,
    closeMenu,
    requestDelete,
    cancelDelete,
    clearSelection,
  };
}
