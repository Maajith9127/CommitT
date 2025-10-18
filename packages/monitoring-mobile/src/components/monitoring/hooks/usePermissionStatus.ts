import { useCallback, useEffect, useState } from "react";
import type { PermissionStatus } from "../../../MonitoringMobile.types";
import MonitoringMobile from "../../../MonitoringMobileModule";

export interface PermissionState extends PermissionStatus {
  isChecking: boolean;
  lastChecked: Date;
  requestInProgress: boolean;
}

export const usePermissionStatus = () => {
  const [state, setState] = useState<PermissionState>({
    usageStatsGranted: false,
    canRequestPermission: true,
    isChecking: false,
    lastChecked: new Date(),
    requestInProgress: false,
  });

  const checkPermission = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isChecking: true }));
      const permissionStatus = await MonitoringMobile.getPermissionStatus();
      setState((prev) => ({
        ...prev,
        ...permissionStatus,
        isChecking: false,
        lastChecked: new Date(),
      }));
    } catch (error) {
      console.error("Failed to check permission status:", error);
      setState((prev) => ({
        ...prev,
        isChecking: false,
        lastChecked: new Date(),
      }));
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, requestInProgress: true }));
      const success = await MonitoringMobile.requestUsagePermission();

      // Wait a moment for the user to return from settings
      setTimeout(() => {
        checkPermission(); // Re-check permission after returning from settings
        setState((prev) => ({ ...prev, requestInProgress: false }));
      }, 1000);

      return success;
    } catch (error) {
      console.error("Failed to request permission:", error);
      setState((prev) => ({ ...prev, requestInProgress: false }));
      return false;
    }
  }, [checkPermission]);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    ...state,
    checkPermission,
    requestPermission,
  };
};
