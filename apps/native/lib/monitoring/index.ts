// Export types

// Export module
export { default as MonitoringModule } from "./MonitoringModule";
export * from "./types";
// Export hook
export { useMonitoring } from "./useMonitoring";

// Main API wrapper
import MonitoringModule from "./MonitoringModule";
import type {
  DailySummary,
  MonitoringEventPayload,
  PermissionStatus,
  PermissionStatusPayload,
  UsageData,
} from "./types";

export const Monitoring = {
  // Service Control
  async start(): Promise<boolean> {
    return await MonitoringModule.startMonitoring();
  },

  async stop(): Promise<boolean> {
    return await MonitoringModule.stopMonitoring();
  },

  async isActive(): Promise<boolean> {
    return await MonitoringModule.isMonitoringActive();
  },

  // Permission Handling
  async hasPermission(): Promise<boolean> {
    return await MonitoringModule.hasUsageStatsPermission();
  },

  async requestPermission(): Promise<boolean> {
    return await MonitoringModule.requestUsagePermission();
  },

  async getPermissionStatus(): Promise<PermissionStatus> {
    return await MonitoringModule.getPermissionStatus();
  },

  // Data Retrieval
  async getUsageData(startDate: string, endDate: string): Promise<UsageData[]> {
    return await MonitoringModule.getUsageData(startDate, endDate);
  },

  async getDailySummaries(
    startDate: string,
    endDate: string
  ): Promise<DailySummary[]> {
    return await MonitoringModule.getDailySummaries(startDate, endDate);
  },

  // Data Management
  async syncData(): Promise<boolean> {
    return await MonitoringModule.syncDataNow();
  },

  // Event System
  addEventListener(listener: (event: MonitoringEventPayload) => void) {
    return MonitoringModule.addListener("onMonitoringEvent", listener);
  },

  addPermissionListener(listener: (event: PermissionStatusPayload) => void) {
    return MonitoringModule.addListener("onPermissionStatusChanged", listener);
  },
};
