import { create } from "zustand";

export type DeviceApp = {
  id: string;
  name: string;
  iconUri: string | null;
};

type AppStore = {
  apps: DeviceApp[];
  setApps: (apps: DeviceApp[]) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  apps: [],
  setApps: (apps) => set({ apps }),
}));
