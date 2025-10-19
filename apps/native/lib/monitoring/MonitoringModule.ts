import { NativeModules, NativeEventEmitter } from 'react-native';
import type {
  DailySummary,
  MonitoringModuleEvents,
  PermissionStatus,
  UsageData,
} from './types';

interface MonitoringModuleInterface {
  startMonitoring(): Promise<boolean>;
  stopMonitoring(): Promise<boolean>;
  isMonitoringActive(): Promise<boolean>;
  hasUsageStatsPermission(): Promise<boolean>;
  requestUsagePermission(): Promise<boolean>;
  getPermissionStatus(): Promise<PermissionStatus>;
  getUsageData(startDate: string, endDate: string): Promise<UsageData[]>;
  getDailySummaries(startDate: string, endDate: string): Promise<DailySummary[]>;
  syncDataNow(): Promise<boolean>;
}

// Get native module with fallback
const { MonitoringModule: NativeModule } = NativeModules;

// Fallback functions for when native module is unavailable
const createFallbackModule = (): MonitoringModuleInterface => ({
  startMonitoring: async () => {
    console.warn('MonitoringModule: Native module not available');
    return false;
  },
  stopMonitoring: async () => {
    console.warn('MonitoringModule: Native module not available');
    return false;
  },
  isMonitoringActive: async () => {
    console.warn('MonitoringModule: Native module not available');
    return false;
  },
  hasUsageStatsPermission: async () => {
    console.warn('MonitoringModule: Native module not available');
    return false;
  },
  requestUsagePermission: async () => {
    console.warn('MonitoringModule: Native module not available');
    return false;
  },
  getPermissionStatus: async () => {
    console.warn('MonitoringModule: Native module not available');
    return { usageStatsGranted: false, canRequestPermission: false };
  },
  getUsageData: async () => {
    console.warn('MonitoringModule: Native module not available');
    return [];
  },
  getDailySummaries: async () => {
    console.warn('MonitoringModule: Native module not available');
    return [];
  },
  syncDataNow: async () => {
    console.warn('MonitoringModule: Native module not available');
    return false;
  },
});

// Use native module or fallback
const module = NativeModule || createFallbackModule();

// Create event emitter only if native module is available
const eventEmitter = NativeModule ? new NativeEventEmitter(NativeModule) : null;

export default {
  ...module,
  addListener: (eventName: keyof MonitoringModuleEvents, listener: (event: any) => void) => {
    if (eventEmitter) {
      return eventEmitter.addListener(eventName, listener);
    }
    console.warn('MonitoringModule: Event emitter not available');
    return { remove: () => {} };
  },
  removeListener: (eventName: keyof MonitoringModuleEvents) => {
    if (eventEmitter) {
      return eventEmitter.removeAllListeners(eventName);
    }
    return undefined;
  },
  removeAllListeners: (eventName?: keyof MonitoringModuleEvents) => {
    if (eventEmitter) {
      if (eventName) {
        return eventEmitter.removeAllListeners(eventName);
      }
      eventEmitter.removeAllListeners('onMonitoringEvent');
      eventEmitter.removeAllListeners('onPermissionStatusChanged');
    }
    return undefined;
  },
} as MonitoringModuleInterface & {
  addListener: (eventName: keyof MonitoringModuleEvents, listener: (event: any) => void) => any;
  removeListener: (eventName: keyof MonitoringModuleEvents) => any;
  removeAllListeners: (eventName?: keyof MonitoringModuleEvents) => any;
};
