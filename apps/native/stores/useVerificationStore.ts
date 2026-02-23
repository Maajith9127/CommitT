import { create } from 'zustand';

type VerificationStore = {
  upcomingEvent: any | null;
  setUpcomingEvent: (event: any | null) => void;
};

// Logger middleware for easy debugging
const logger = (config: any) => (set: any, get: any, api: any) =>
  config(
    (...args: any[]) => {
      const actionName = args[2] ?? "anonymous";
      set(...args);
      const state = get();
      console.log(`\n[VerificationStore] 🔄 ${actionName}`);
      console.log(`{ upcomingEvent: ${state.upcomingEvent?.title || 'None'} (${state.upcomingEvent?._id || 'N/A'}) }`);
    },
    get,
    api
  );

export const useVerificationStore = create<VerificationStore>()(
  logger((set) => ({
    upcomingEvent: null,
    setUpcomingEvent: (event: any | null) => 
      set({ upcomingEvent: event }, false, "verification/setUpcomingEvent"),
  }))
);
