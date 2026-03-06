/**
 * @file usePenaltySync.ts
 * @description Centralized hooks for synchronizing penalty configuration
 * with the Zustand TaskDraft store.
 */

import { useCallback } from "react";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";

/**
 * @hook usePenaltySync
 * @description Provides the current draft and a stable sync function.
 */
export function usePenaltySync() {
  const draft = useTaskDraftStore((s) => s.draft);

  /**
   * Stable sync function.
   * Uses getState() to avoid dependency loops.
   */
  const syncToDraft = useCallback((updates: any) => {
    const currentDraft = useTaskDraftStore.getState().draft;
    const type = currentDraft.penalty?.type || "embarrassing_photo";
    const currentConfig = currentDraft.penalty?.config || {};

    useTaskDraftStore.getState().setDraft({
      penalty: {
        type,
        config: {
          ...currentConfig,
          ...updates,
        },
      },
    });
  }, []);

  return { draft, syncToDraft };
}
