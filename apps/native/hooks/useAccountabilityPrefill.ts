import { useEffect } from "react";
import { useConvex } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";

/**
 * PRODUCTION RATIONALE: "The Smart Handshake"
 * This hook acts as the glue between the user's permanent "Accountability Identity"
 * and the transient "Task Creation Draft."
 */
export function useAccountabilityPrefill() {
  const { draft, setDraft } = useTaskDraftStore();
  const convex = useConvex();
  
  useEffect(() => {
    // 1. EXIT if already prefilled (prevents the "Bounce Back" bug when clearing)
    if (draft.isAccountabilityPrefilled) return;

    // 2. EXIT if this is an existing task (we don't overwrite manual edits of old tasks)
    if (draft.id) return;

    async function performPrefill() {
      try {
        // One-shot HTTP fetch (Not a live subscription)
        const preset = await convex.query(api.api.commitments.presets.getLatest);
        
        if (preset) {
          console.log("[Prefill] Smart Pre-fill activated. Loading accountability identity...");
          
          setDraft({
            penalty: preset.penalty,
            penalty_waiver: preset.penalty_waiver,
            isAccountabilityPrefilled: true // LOCK: Signal that we've done our job
          });
        }
      } catch (err) {
        console.error("[Prefill] Failed to load accountability identity:", err);
      }
    }

    performPrefill();
  }, [convex, draft.id, draft.isAccountabilityPrefilled, setDraft]);
}
