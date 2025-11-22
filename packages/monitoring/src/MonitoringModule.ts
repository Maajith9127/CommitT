import { NativeModule, requireNativeModule } from "expo";

import type {
  DailySummary,
  MonitoringModuleEvents,
  PermissionStatus,
  UsageData,
} from "./Monitoring.types";

declare class MonitoringModule extends NativeModule<MonitoringModuleEvents> {
  // Service Control - Core monitoring lifecycle
  startMonitoring(): Promise<boolean>;
  stopMonitoring(): Promise<boolean>;
  isMonitoringActive(): Promise<boolean>;

  // Permission Handling - Android usage stats access
  hasUsageStatsPermission(): Promise<boolean>;
  requestUsagePermission(): Promise<boolean>;
  getPermissionStatus(): Promise<PermissionStatus>;

  // Data Retrieval - Usage analytics data
  getUsageData(startDate: string, endDate: string): Promise<UsageData[]>;
  getDailySummaries(
    startDate: string,
    endDate: string
  ): Promise<DailySummary[]>;

  // Data Management - Background synchronization
  syncDataNow(): Promise<boolean>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<MonitoringModule>("Monitoring");
