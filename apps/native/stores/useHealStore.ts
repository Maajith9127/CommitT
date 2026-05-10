import { create } from 'zustand';

interface HealState {
  isHealing: boolean;
  message: string;
  startHealing: (message?: string) => void;
  stopHealing: () => void;
  isCrashed: boolean;
  crashMessage: string;
  triggerCrash: (message: string) => void;
}

export const useHealStore = create<HealState>((set) => ({
  isHealing: false,
  message: "Synchronizing...",
  isCrashed: false,
  crashMessage: "",
  startHealing: (message) => {
    console.log("[HealStore] 🟡 startHealing triggered:", message);
    set({ 
      isHealing: true, 
      message: message || "Cloud save successful. Healing local cache...",
      isCrashed: false 
    });
  },
  stopHealing: () => {
    console.log("[HealStore] 🟢 stopHealing triggered");
    set({ isHealing: false });
  },
  triggerCrash: (message) => {
    console.log("[HealStore] 🔴 triggerCrash triggered:", message);
    set({
      isHealing: false,
      isCrashed: true,
      crashMessage: message
    });
  }
}));
