import { useState, useEffect } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Enforcement } from "@/modules/enforcement-module";

export interface PermissionStates {
  camera: boolean;
  location: boolean;
  notifications: boolean;
  alarms: boolean;
  battery: boolean;
  overlay: boolean;
  accessibility: boolean;
}

/**
 * usePermissions
 * -----------------------------------------------------------------------------
 * CORE PERMISSION ENGINE: Synchronizes hardware/OS level permissions with UI state.
 * 
 * This hook performs reactive checks for all critical permissions needed by the
 * CommitT ecosystem (Verification, Scheduling, and Anti-Cheat).
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionStates>({
    camera: false,
    location: false,
    notifications: false,
    alarms: false,
    battery: false,
    overlay: false,
    accessibility: false,
  });

  const [isLoading, setIsLoading] = useState(true);

  const checkPermissions = async () => {
    setIsLoading(true);
    try {
      const results = await Enforcement.checkAllPermissions();

      setPermissions({
        location: results.location,
        camera: results.camera,
        notifications: results.notifications,
        alarms: results.alarms,
        battery: results.battery,
        overlay: results.overlay,
        accessibility: results.accessibility,
      });
    } catch (error) {
      console.error("[usePermissions] Error checking permission manifest:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  return { permissions, isLoading, refresh: checkPermissions };
}
