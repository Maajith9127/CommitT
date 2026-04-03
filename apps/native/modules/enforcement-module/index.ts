import { requireNativeModule } from "expo-modules-core";

export type EnforcementPermissions = {
  camera: boolean;
  location: boolean;
  notifications: boolean;
  alarms: boolean;
  battery: boolean;
  overlay: boolean;
  accessibility: boolean;
};

type EnforcementModuleType = {
  checkAllPermissions: () => Promise<EnforcementPermissions>;
  openSettings: (type: string) => void;
};

export const Enforcement = requireNativeModule<EnforcementModuleType>("Enforcement");
