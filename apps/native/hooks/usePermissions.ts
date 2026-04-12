import { useState, useEffect } from "react";
import { AppState, AppStateStatus, Platform, PermissionsAndroid } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Enforcement } from "@/modules/enforcement-module";

/**
 * Unified interface representing all critical system-level enforcer states.
 * 
 * Each field corresponds to a mandatory hardware or OS security gate required 
 * for CommitT behavioral enforcement to be legally "armed" on the device.
 */
export interface PermissionStates {
  camera: boolean;
  location: boolean;
  notifications: boolean;
  alarms: boolean;
  battery: boolean;
  overlay: boolean;
  accessibility: boolean;
  admin: boolean;
}

/**
 * usePermissions
 * -----------------------------------------------------------------------------
 * CORE PERMISSION ENGINE: Synchronizes hardware/OS level permissions with UI state.
 * 
 * This hook performs reactive checks for all critical permissions needed by the
 * CommitT ecosystem (Verification, Scheduling, and Anti-Cheat).
 * 
 * UPDATED: Now listens for AppState changes to trigger a re-audit whenever the 
 * user foregrounds the app (e.g. after toggling settings).
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
    admin: false,
  });

  const [isLoading, setIsLoading] = useState(true);

  /**
   * checkPermissions
   * 
   * Executes a batch audit of all 8 system gates via the native EnforcementModule.
   * This method is designed to be non-blocking, utilizing the AsyncFunction 
   * bridge to prevent UI jank during system-level lookups.
   */
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
        admin: results.admin,
      });
    } catch (error) {
      console.error("[usePermissions] Error checking permission manifest:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial check on mount
    checkPermissions();

    // Listen for app foregrounding (whenever user comes back to app)
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        console.log("[usePermissions] App foregrounded, re-auditing enforcers...");
        checkPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return { permissions, isLoading, refresh: checkPermissions };
}
