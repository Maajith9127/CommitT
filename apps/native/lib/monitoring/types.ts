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
export type MonitoringEventPayload =
  | {
      type: "screen_event";
      data: {
        eventType: "SCREEN_ON" | "SCREEN_OFF" | "USER_PRESENT";
        idleTime?: number;
        sessionDuration?: number;
        timeSinceScreenOn?: number;
      };
      timestamp: number;
    }
  | {
      type: "usage_event";
      data: {
        eventType: "APP_RESUMED" | "APP_PAUSED" | "APP_STOPPED";
        packageName: string;
        timestamp: number;
      };
      timestamp: number;
    }
  | {
      type: "network_event";
      data: { bytesSent: number; bytesReceived: number };
      timestamp: number;
    }
  | {
      type: "service_status";
      data: {
        status: "STARTING" | "STARTED" | "STOPPING";
        message: string;
      };
      timestamp: number;
    };

export type PermissionStatusPayload = PermissionStatus;

// Module event definitions
export type MonitoringModuleEvents = {
  onMonitoringEvent: (params: MonitoringEventPayload) => void;
  onPermissionStatusChanged: (params: PermissionStatusPayload) => void;
};
