import { useCallback, useEffect, useState } from "react";
import MonitoringModule from "./MonitoringModule";
import type { DailySummary, MonitoringEventPayload, UsageData } from "./types";

interface MonitoringState {
  isActive: boolean;
  hasPermission: boolean;
  isLoading: boolean;
  error: string | null;
}

interface MonitoringActions {
  startMonitoring: () => Promise<boolean>;
  stopMonitoring: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  getUsageData: (startDate: string, endDate: string) => Promise<UsageData[]>;
  getDailySummaries: (
    startDate: string,
    endDate: string
  ) => Promise<DailySummary[]>;
  syncData: () => Promise<boolean>;
  clearError: () => void;
  addEventListener: (listener: (event: MonitoringEventPayload) => void) => {
    remove: () => void;
  };
}

export const useMonitoring = (): MonitoringState & MonitoringActions => {
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize monitoring status
  useEffect(() => {
    const initializeStatus = async () => {
      try {
        setIsLoading(true);
        const [active, permission] = await Promise.all([
          MonitoringModule.isMonitoringActive(),
          MonitoringModule.hasUsageStatsPermission(),
        ]);
        setIsActive(active);
        setHasPermission(permission);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize monitoring"
        );
      } finally {
        setIsLoading(false);
      }
    };

    initializeStatus();
  }, []);

  // Helper function to handle async operations with better error handling
  const handleAsyncOperation = useCallback(
    async <T>(
      operation: () => Promise<T>,
      errorMessage: string,
      onSuccess?: (result: T) => void
    ): Promise<T | null> => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await operation();
        onSuccess?.(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : errorMessage;
        setError(message);
        console.error("Monitoring operation failed:", err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Start monitoring
  const startMonitoring = useCallback(async () => {
    const result = await handleAsyncOperation(
      () => MonitoringModule.startMonitoring(),
      "Failed to start monitoring"
    );

    if (result) {
      setIsActive(true);
    }
    return result;
  }, [handleAsyncOperation]);

  // Stop monitoring
  const stopMonitoring = useCallback(async () => {
    const result = await handleAsyncOperation(
      () => MonitoringModule.stopMonitoring(),
      "Failed to stop monitoring"
    );

    if (result) {
      setIsActive(false);
    }
    return result;
  }, [handleAsyncOperation]);

  // Request permission
  const requestPermission = useCallback(async () => {
    const result = await handleAsyncOperation(
      () => MonitoringModule.requestUsagePermission(),
      "Failed to request permission"
    );

    if (result) {
      // Recheck permission status
      const hasPerm = await MonitoringModule.hasUsageStatsPermission();
      setHasPermission(hasPerm);
    }
    return result;
  }, [handleAsyncOperation]);

  // Get usage data
  const getUsageData = useCallback(
    async (startDate: string, endDate: string): Promise<UsageData[]> => {
      const result = await handleAsyncOperation(
        () => MonitoringModule.getUsageData(startDate, endDate),
        "Failed to get usage data"
      );
      return result || [];
    },
    [handleAsyncOperation]
  );

  // Get daily summaries
  const getDailySummaries = useCallback(
    async (startDate: string, endDate: string): Promise<DailySummary[]> => {
      const result = await handleAsyncOperation(
        () => MonitoringModule.getDailySummaries(startDate, endDate),
        "Failed to get daily summaries"
      );
      return result || [];
    },
    [handleAsyncOperation]
  );

  // Sync data
  const syncData = useCallback(async () => {
    const result = await handleAsyncOperation(
      () => MonitoringModule.syncDataNow(),
      "Failed to sync data"
    );
    return result;
  }, [handleAsyncOperation]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isActive,
    hasPermission,
    isLoading,
    error,

    // Actions
    startMonitoring,
    stopMonitoring,
    requestPermission,
    getUsageData,
    getDailySummaries,
    syncData,
    clearError,

    // Event listeners
    addEventListener: MonitoringModule.addListener,
  };
};
