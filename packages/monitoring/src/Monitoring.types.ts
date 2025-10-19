// Core monitoring data types
export type UsageData = {
  id: number;
  appPackage: string;
  startTime: number;
  endTime: number | null;
  duration: number;
  isActive: boolean;
};

export type DailySummary = {
  date: string;
  totalUsageTime: number;
  idleTime: number;
  sessionCount: number;
  lastUpdated: number;
};

export type PermissionStatus = {
  usageStatsGranted: boolean;
  canRequestPermission: boolean;
};

// Event system types
export type MonitoringEventPayload = {
  type: "screen_event" | "usage_event" | "network_event" | "service_status";
  data: any;
  timestamp: number;
};

export type PermissionStatusPayload = {
  usageStatsGranted: boolean;
  canRequestPermission: boolean;
};

// Module event definitions
export type MonitoringModuleEvents = {
  onMonitoringEvent: (params: MonitoringEventPayload) => void;
  onPermissionStatusChanged: (params: PermissionStatusPayload) => void;
};
