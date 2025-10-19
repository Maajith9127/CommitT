// Reexport the native Android module for Expo

export * from "./src/Monitoring.types";
export { default } from "./src/MonitoringModule";

// Frontend-friendly API wrapper for easy integration
import MonitoringModule from "./src/MonitoringModule";
import type {
  UsageData,
  DailySummary,
  PermissionStatus,
  MonitoringEventPayload,
  PermissionStatusPayload,
} from "./src/Monitoring.types";

interface MonitoringAPI {
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
  isActive(): Promise<boolean>;
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  getPermissionStatus(): Promise<PermissionStatus>;
  getUsageData(startDate: string, endDate: string): Promise<UsageData[]>;
  getDailySummaries(
    startDate: string,
    endDate: string
  ): Promise<DailySummary[]>;
  syncData(): Promise<boolean>;
  addEventListener(listener: (event: MonitoringEventPayload) => void): any;
  addPermissionListener(
    listener: (event: PermissionStatusPayload) => void
  ): any;
}

export const Monitoring: MonitoringAPI = {
  // Service Control - Start/stop monitoring lifecycle
  async start(): Promise<boolean> {
    return await MonitoringModule.startMonitoring();
  },

  async stop(): Promise<boolean> {
    return await MonitoringModule.stopMonitoring();
  },

  async isActive(): Promise<boolean> {
    return await MonitoringModule.isMonitoringActive();
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
