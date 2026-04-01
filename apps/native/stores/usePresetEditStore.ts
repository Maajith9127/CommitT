import { create } from "zustand";

// ─────────────────────────────────────────────────────────────────────────────
// PRESET EDIT BRIDGE STORE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * usePresetEditStore
 *
 * A lightweight Zustand store that bridges data between the edit-location-preset
 * page and its child search page (search-preset-location).
 *
 * WHY A DEDICATED STORE?
 *   The main `useTaskDraftStore` is sacred — it holds the state for the active
 *   commitment creation flow. Editing a preset must NEVER touch that store,
 *   as it would silently corrupt a half-finished commitment draft.
 *
 *   This store is intentionally minimal and ephemeral. It only holds the
 *   data needed to round-trip between the map and the search results page.
 */

interface PresetEditState {
  address: string;
  latitude: number;
  longitude: number;
  radius: number;

  setLocation: (loc: {
    latitude: number;
    longitude: number;
    address: string;
    radius?: number;
  }) => void;

  setAddress: (address: string) => void;
  setRadius: (radius: number) => void;

  hydrate: (data: {
    address: string;
    latitude: number;
    longitude: number;
    radius: number;
  }) => void;

  reset: () => void;
}

const DEFAULTS = {
  address: "Selected Location",
  latitude: 0,
  longitude: 0,
  radius: 20,
};

export const usePresetEditStore = create<PresetEditState>((set) => ({
  ...DEFAULTS,

  setLocation: (loc) =>
    set({
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: loc.address,
      ...(loc.radius !== undefined ? { radius: loc.radius } : {}),
    }),

  setAddress: (address) => set({ address }),
  setRadius: (radius) => set({ radius }),
  hydrate: (data) => set({ ...data }),
  reset: () => set({ ...DEFAULTS }),
}));
