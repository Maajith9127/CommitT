import { useCallback, useEffect, useState } from "react";
import MonitoringMobile from "../../../MonitoringMobileModule";

export interface MonitoringServiceState {
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  lastChecked: Date;
}

export const useMonitoringService = () => {
  const [state, setState] = useState<MonitoringServiceState>({
    isActive: false,
    isLoading: false,
    error: null,
    lastChecked: new Date(),
  });

  const checkStatus = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const isActive = await MonitoringMobile.isMonitoringActive();
      setState((prev) => ({
        ...prev,
        isActive,
        isLoading: false,
        lastChecked: new Date(),
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check service status",
        lastChecked: new Date(),
      }));
    }
  }, []);

  const startMonitoring = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const success = await MonitoringMobile.startMonitoring();
      if (success) {
        setState((prev) => ({
          ...prev,
          isActive: true,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to start monitoring service",
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to start monitoring",
      }));
    }
  }, []);

  const stopMonitoring = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const success = await MonitoringMobile.stopMonitoring();
      if (success) {
        setState((prev) => ({
          ...prev,
          isActive: false,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to stop monitoring service",
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to stop monitoring",
      }));
    }
  }, []);

  // Auto-check status on mount and periodically
  useEffect(() => {
    checkStatus();

    const interval = setInterval(() => {
      checkStatus();
    }, 10_000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [checkStatus]);

  return {
    ...state,
    startMonitoring,
    stopMonitoring,
    checkStatus,
  };
};
