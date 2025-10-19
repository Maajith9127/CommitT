import { NativeModule, registerWebModule } from "expo";

import type {
  DailySummary,
  MonitoringModuleEvents,
  PermissionStatus,
  UsageData,
} from "./Monitoring.types";

class MonitoringModule extends NativeModule<MonitoringModuleEvents> {
  // Service Control - Android-only functionality with web warnings
  async startMonitoring(): Promise<boolean> {
    console.warn(
      "[Monitoring] startMonitoring: Only available on Android platform"
    );
    return false;
  }

  async stopMonitoring(): Promise<boolean> {
    console.warn(
      "[Monitoring] stopMonitoring: Only available on Android platform"
    );
    return false;
  }

  async isMonitoringActive(): Promise<boolean> {
    console.warn(
      "[Monitoring] isMonitoringActive: Only available on Android platform"
    );
    return false;
  }

  // Permission Handling - Android usage stats specific
  async hasUsageStatsPermission(): Promise<boolean> {
    console.warn(
      "[Monitoring] hasUsageStatsPermission: Usage stats only available on Android platform"
    );
    return false;
  }

  async requestUsagePermission(): Promise<boolean> {
    console.warn(
      "[Monitoring] requestUsagePermission: Usage stats only available on Android platform"
    );
    return false;
  }

  async getPermissionStatus(): Promise<PermissionStatus> {
    console.warn(
      "[Monitoring] getPermissionStatus: Usage stats only available on Android platform"
    );
    return {
      usageStatsGranted: false,
      canRequestPermission: false,
    };
  }

  // Data Retrieval - Android usage analytics specific
  async getUsageData(
    _startDate: string,
    _endDate: string
  ): Promise<UsageData[]> {
    console.warn(
      "[Monitoring] getUsageData: Usage data only available on Android platform"
    );
    return [];
  }

  async getDailySummaries(
    _startDate: string,
    _endDate: string
  ): Promise<DailySummary[]> {
    console.warn(
      "[Monitoring] getDailySummaries: Daily summaries only available on Android platform"
    );
    return [];
  }

  // Data Management - Android background sync specific
  async syncDataNow(): Promise<boolean> {
    console.warn(
      "[Monitoring] syncDataNow: Data sync only available on Android platform"
    );
    return false;
  }
}

export default registerWebModule(MonitoringModule, "MonitoringModule");
