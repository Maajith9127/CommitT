import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";

/**
 * PRODUCTION RATIONALE: "The Smart Handshake"
 * This hook acts as the glue between the user's permanent "Accountability Identity"
 * and the transient "Task Creation Draft."
 * 
 * DESIGN PHILOSOPHY:
 * 1. Stealth Loading: We fetch the preset in the background of the main screen.
 * 2. Non-Destructive Pre-fill: We only push data into the Zustand store if the 
 *    draft is currently "Empty" (no title, no ID). This prevents us from 
 *    overwriting a user's active manual edits or a task they are currently editing.
 * 3. Freshness: By using the Convex query, we ensure that if the user saves a 
 *    new preset on another device (or gets updated by a previous task), the 
 *    next time they open the app, the draft is already updated.
 */
export function useAccountabilityPrefill() {
  const { draft, setDraft } = useTaskDraftStore();
  
  // Fetch the definitive accountability identity for this user
  const preset = useQuery(api.api.commitments.presets.getLatest);

  useEffect(() => {
    // CONDITION: Only pre-fill if the draft is currently "Untouched".
    // 1. Title is empty (user hasn't started typing)
    // 2. ID is empty (not an existing task being edited)
    // 3. Penalty is missing (to avoid double-patches if they manually chose one)
    // 3. Penalty is UNDEFINED (strictly). If it is null, the user explicitly cleared it.
    const isUntouched = !draft.id && !draft.title && draft.penalty === undefined;

    if (isUntouched && preset) {
      console.log("[Prefill] Smart Pre-fill activated. Loading accountability identity...");
      
      setDraft({
        penalty: preset.penalty,
        penalty_waiver: preset.penalty_waiver,
      });
    }
  }, [preset, draft.title, draft.id, draft.penalty, setDraft]);
}
