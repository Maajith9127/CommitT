/**
 * @file useWaiverSync.ts
 * @description Centralized hooks for synchronizing penalty waiver configuration
 * with the Zustand TaskDraft store.
 */

import { useCallback } from "react";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";

/**
 * @hook useWaiverSync
 * @description Provides the current waiver draft and a stable sync function.
 */
export function useWaiverSync() {
  const waiver = useTaskDraftStore((s) => s.draft.penalty_waiver);
  const setWaiver = useTaskDraftStore((s) => s.setWaiver);

  /**
   * Quick toggle to enable/disable waiver
   */
  const toggleWaiver = useCallback((enabled: boolean) => {
    if (enabled) {
      setWaiver({
        type: "captcha",
        config: { count: 5, difficulty: "medium" },
        deadline_minutes: 60,
      });
    } else {
      useTaskDraftStore.getState().setDraft({ penalty_waiver: null });
    }
  }, [setWaiver]);

  return { waiver, setWaiver, toggleWaiver };
}
