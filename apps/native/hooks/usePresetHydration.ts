/**
 * usePresetHydration
 * ─────────────────────────────────────────────────────────────────────────────
 * One-shot hydration hook that populates the PresetStore with the user's
 * saved condition presets (locations + app blocklists).
 *
 * PRODUCTION RATIONALE: "Load Once, Serve Forever"
 *   This hook follows the exact same pattern as `useAccountabilityPrefill`:
 *   it fires a one-shot Convex query (NOT a live subscription) on mount,
 *   writes the results to Zustand, and then exits. Every subsequent modal
 *   open reads from the Zustand cache — zero loading spinners, zero delays.
 *
 * HYDRATION GUARD:
 *   The hook checks `hydrationStatus` before fetching. If the store is
 *   already "loading" or "ready", it NO-OPs. This prevents:
 *     • Duplicate network requests when navigating between screens
 *     • Race conditions from React StrictMode double-mounts
 *     • Unnecessary re-fetches when the user bounces between tabs
 *
 * PLACEMENT:
 *   Call this hook at the TOP of the commitment creation flow (e.g., in the
 *   `(create-commit)/_layout.tsx` or the first screen the user sees). By the
 *   time the user reaches `time-set.tsx`, the data is already in memory.
 *
 * USAGE:
 *   function CreateCommitLayout() {
 *     usePresetHydration(); // Fires once, populates store
 *     return <Stack />;
 *   }
 */

import { useEffect } from "react";
import { useConvex } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { usePresetStore } from "@/stores/usePresetStore";

export function usePresetHydration() {
  const convex = useConvex();

  // ── Zustand selectors (granular to prevent unnecessary re-renders) ──
  const hydrationStatus = usePresetStore((s) => s.hydrationStatus);
  const setLocations = usePresetStore((s) => s.setLocations);
  const setDigitalCommitments = usePresetStore((s) => s.setDigitalCommitments);
  const setHydrationStatus = usePresetStore((s) => s.setHydrationStatus);

  useEffect(() => {
    // ── HYDRATION GUARD: Only fetch if the store is idle ──
    // If we're already loading or ready, bail immediately.
    // This is the critical guard against duplicate fetches.
    if (hydrationStatus !== "idle") return;

    async function hydrate() {
      setHydrationStatus("loading");
      console.log("[PresetHydration] Initiating one-shot preset fetch...");

      try {
        // ── PARALLEL FETCH: Both preset types in one Promise.all ──
        // This halves the total latency compared to sequential fetching.
        const [locations, digitalCommitments] = await Promise.all([
          convex.query(api.api.commitments.presets.getRecommendedLocations, { limit: 10 }),
          convex.query(api.api.commitments.presets.getRecommendedDigitalCommitments, { limit: 10 }),
        ]);

        // ── WRITE TO STORE ──
        setLocations(locations as any[]);
        setDigitalCommitments(digitalCommitments as any[]);
        setHydrationStatus("ready");

        console.log(
          `[PresetHydration] Store hydrated — ${locations.length} locations, ${digitalCommitments.length} digital presets`
        );
      } catch (error) {
        console.error("[PresetHydration] Failed to hydrate preset store:", error);
        setHydrationStatus("error");
      }
    }

    hydrate();
  }, [convex, hydrationStatus, setLocations, setDigitalCommitments, setHydrationStatus]);
}
