import { NativeModule, requireNativeModule } from "expo";

import type {
  DailySummary,
  MonitoringMobileModuleEvents,
  PermissionStatus,
  UsageData,
} from "./MonitoringMobile.types";

declare class MonitoringMobileModule extends NativeModule<MonitoringMobileModuleEvents> {
  // Service Control
  startMonitoring(): Promise<boolean>;
  stopMonitoring(): Promise<boolean>;
  isMonitoringActive(): Promise<boolean>;

  // Permission Handling
  hasUsageStatsPermission(): Promise<boolean>;
  requestUsagePermission(): Promise<boolean>;
  getPermissionStatus(): Promise<PermissionStatus>;

  // Data Retrieval
  getUsageData(startDate: string, endDate: string): Promise<UsageData[]>;
  getDailySummaries(
    startDate: string,
    endDate: string
  ): Promise<DailySummary[]>;

  // Data Management
  syncDataNow(): Promise<boolean>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<MonitoringMobileModule>("MonitoringMobile");
