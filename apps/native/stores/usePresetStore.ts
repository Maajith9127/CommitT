/**
 * usePresetStore
 * ─────────────────────────────────────────────────────────────────────────────
 * Zustand store for the user's "Condition Preset Library."
 *
 * PRODUCTION RATIONALE: "Instant Recall"
 *   When the user opens a preset picker modal (Location / App Blocklist),
 *   the data must appear INSTANTLY — not after a 200-500ms Convex round-trip.
 *   This store acts as the in-memory cache that is hydrated ONCE when the
 *   user enters the commitment creation flow, and then read synchronously
 *   by every picker modal for the rest of the session.
 *
 * HYDRATION LIFECYCLE:
 *   1. User opens commitment creation flow (e.g., navigates to time-set)
 *   2. `usePresetHydration()` hook fires a one-shot Convex query
 *   3. Results are written to this store via `setLocations` / `setDigitalCommitments`
 *   4. Picker modals read from this store via selectors — zero network delay
 *   5. Store is cleared via `reset()` when the user exits the creation flow
 *
 * SCHEMA ALIGNMENT:
 *   LocationPreset  → maps to `locationPresets` table in schema.ts
 *   DigitalPreset   → maps to `digitalCommitmentPresets` table in schema.ts
 *
 * ARCHITECTURE:
 *   usePresetStore (this file — Zustand state)
 *     ├── usePresetHydration (hook — fetches from Convex, writes to store)
 *     ├── LocationPresetPickerModal (reads from store)
 *     └── DigitalPresetPickerModal (reads from store)
 */

import { create } from "zustand";

// ── Types ───────────────────────────────────────────────────────────────────

/** Shape of a saved location preset (mirrors `locationPresets` table) */
export type LocationPreset = {
  _id: string;
  address: string;
  lat: number;
  lng: number;
  radius: number;
  usage_count: number;
  last_used_at: number;
};

/** Shape of a saved app-blocklist preset (mirrors `digitalCommitmentPresets` table) */
export type DigitalPreset = {
  _id: string;
  apps: string[];
  websites: string[];
  name?: string;
  usage_count: number;
  last_used_at: number;
};

/** Hydration status for the store. Prevents duplicate fetches. */
export type HydrationStatus = "idle" | "loading" | "ready" | "error";

// ── Store Shape ─────────────────────────────────────────────────────────────

type PresetStore = {
  // ── Data ──
  locations: LocationPreset[];
  digitalCommitments: DigitalPreset[];

  // ── Hydration Lifecycle ──
  hydrationStatus: HydrationStatus;

  // ── Setters ──
  setLocations: (locations: LocationPreset[]) => void;
  setDigitalCommitments: (presets: DigitalPreset[]) => void;
  setHydrationStatus: (status: HydrationStatus) => void;

  // ── Lifecycle ──
  /** Clears all preset data and resets hydration status to idle. */
  reset: () => void;
};

// ── Store ───────────────────────────────────────────────────────────────────

export const usePresetStore = create<PresetStore>((set) => ({
  // Initial state
  locations: [],
  digitalCommitments: [],
  hydrationStatus: "idle",

  // Setters
  setLocations: (locations) => set({ locations }),
  setDigitalCommitments: (presets) => set({ digitalCommitments: presets }),
  setHydrationStatus: (status) => set({ hydrationStatus: status }),

  // Lifecycle
  reset: () =>
    set({
      locations: [],
      digitalCommitments: [],
      hydrationStatus: "idle",
    }),
}));
