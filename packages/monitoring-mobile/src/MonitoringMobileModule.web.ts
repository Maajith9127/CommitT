import { NativeModule, registerWebModule } from "expo";

import type {
  DailySummary,
  MonitoringMobileModuleEvents,
  PermissionStatus,
  UsageData,
} from "./MonitoringMobile.types";

class MonitoringMobileModule extends NativeModule<MonitoringMobileModuleEvents> {
  // Service Control - Web platform limitations
  async startMonitoring(): Promise<boolean> {
    console.warn("Monitoring is not supported on web platform");
    return false;
  }

  async stopMonitoring(): Promise<boolean> {
    console.warn("Monitoring is not supported on web platform");
    return false;
  }

  async isMonitoringActive(): Promise<boolean> {
    console.warn("Monitoring is not supported on web platform");
    return false;
  }

  // Permission Handling - Web platform limitations
  async hasUsageStatsPermission(): Promise<boolean> {
    console.warn("Usage stats permission is not applicable on web platform");
    return false;
  }

  async requestUsagePermission(): Promise<boolean> {
    console.warn("Usage stats permission is not applicable on web platform");
    return false;
  }

  async getPermissionStatus(): Promise<PermissionStatus> {
    console.warn("Usage stats permission is not applicable on web platform");
    return {
      usageStatsGranted: false,
      canRequestPermission: false,
    };
  }

  // Data Retrieval - Mock data for web
  async getUsageData(startDate: string, endDate: string): Promise<UsageData[]> {
    console.warn("Usage data is not available on web platform");
    return [];
  }

  async getDailySummaries(
    startDate: string,
    endDate: string
  ): Promise<DailySummary[]> {
    console.warn("Daily summaries are not available on web platform");
    return [];
  }

  // Data Management - No-op for web
  async syncDataNow(): Promise<boolean> {
    console.warn("Data sync is not supported on web platform");
    return false;
  }
}

export default registerWebModule(
  MonitoringMobileModule,
  "MonitoringMobileModule"
);
