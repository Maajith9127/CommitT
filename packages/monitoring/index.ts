// Reexport the native module. On web, it will be resolved to MonitoringModule.web.ts
// and on native platforms to MonitoringModule.ts

export * from "./src/Monitoring.types";
export { default } from "./src/MonitoringModule";

import type {
  DailySummary,
  MonitoringEventPayload,
  PermissionStatus,
  PermissionStatusPayload,
  UsageData,
} from "./src/Monitoring.types";
// Frontend-friendly API wrapper for easy integration
import MonitoringModule from "./src/MonitoringModule";

export const Monitoring = {
  // Service Control - Start/stop monitoring lifecycle
  async start(): Promise<boolean> {
    return MonitoringModule.startMonitoring();
  },

  async stop(): Promise<boolean> {
    return MonitoringModule.stopMonitoring();
  },

  async isActive(): Promise<boolean> {
    return MonitoringModule.isMonitoringActive();
  },

  // Permission Handling - Android usage stats access
  async hasPermission(): Promise<boolean> {
    return MonitoringModule.hasUsageStatsPermission();
  },

  async requestPermission(): Promise<boolean> {
    return MonitoringModule.requestUsagePermission();
  },

  async getPermissionStatus(): Promise<PermissionStatus> {
    return MonitoringModule.getPermissionStatus();
  },

  // Data Retrieval - Usage analytics data access
  async getUsageData(startDate: string, endDate: string): Promise<UsageData[]> {
    return MonitoringModule.getUsageData(startDate, endDate);
  },

  async getDailySummaries(
    startDate: string,
    endDate: string
  ): Promise<DailySummary[]> {
    return MonitoringModule.getDailySummaries(startDate, endDate);
  },

  // Data Management - Background synchronization
  async syncData(): Promise<boolean> {
    return MonitoringModule.syncDataNow();
  },

  // Event System - Real-time monitoring updates
  addEventListener(listener: (event: MonitoringEventPayload) => void) {
    return MonitoringModule.addListener("onMonitoringEvent", listener);
  },

  addPermissionListener(listener: (event: PermissionStatusPayload) => void) {
    return MonitoringModule.addListener("onPermissionStatusChanged", listener);
  },
};
