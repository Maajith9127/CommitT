import { create } from 'zustand';

interface HealState {
  isHealing: boolean;
  message: string;
  startHealing: (message?: string) => void;
  stopHealing: () => void;
}

export const useHealStore = create<HealState>((set) => ({
  isHealing: false,
  message: "Synchronizing...",
  startHealing: (message) => {
    console.log("[HealStore] 🟡 startHealing triggered:", message);
    set({ 
      isHealing: true, 
      message: message || "Cloud save successful. Healing local cache..." 
    });
  },
  stopHealing: () => {
    console.log("[HealStore] 🟢 stopHealing triggered");
    set({ isHealing: false });
  },
}));
