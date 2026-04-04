import { create } from 'zustand';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  DEVELOPER CHAOS TESTING STORE (NON-PROD ONLY)                               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  A centralized control panel used strictly for Tier-1 fault injection.       ║
 * ║  Allows developers to artificially crash the Triple-Write Orchestrator       ║
 * ║  at exact phases to mathematically guarantee the Saga Rollback logic works.  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

interface ChaosState {
  faultCloudWrite: boolean;
  faultDiskWrite: boolean;
  faultHardware: boolean;
  
  // High-Level Split Brain induction
  faultCloudUndo: boolean; 
  faultDiskUndo: boolean;

  toggleFault: (key: keyof Omit<ChaosState, 'toggleFault' | 'resetAll'>) => void;
  resetAll: () => void;
}

export const useChaosStore = create<ChaosState>((set) => ({
  faultCloudWrite: false,
  faultDiskWrite: false,
  faultHardware: false,
  faultCloudUndo: false,
  faultDiskUndo: false,

  toggleFault: (key) => set((state) => ({ [key]: !state[key] })),
  resetAll: () => set({
    faultCloudWrite: false,
    faultDiskWrite: false,
    faultHardware: false,
    faultCloudUndo: false,
    faultDiskUndo: false,
  }),
}));
