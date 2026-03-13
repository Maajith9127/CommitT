import { useState, useEffect } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";

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
      // 1. Location (Foreground)
      const { status: locStatus } = await Location.getForegroundPermissionsAsync();
      
      // 2. Camera / Media Library
      const { status: camStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();

      // 3. Notifications (Android 13+ check via PermissionsAndroid)
      let notifGranted = false;
      if (Platform.OS === "android") {
        if (Number(Platform.Version) >= 33) {
          // @ts-ignore - POST_NOTIFICATIONS exists in runtime but might be missing in older types
          const granted = await PermissionsAndroid.check("android.permission.POST_NOTIFICATIONS");
          notifGranted = granted;
        } else {
          notifGranted = true; // Older versions granted on install
        }
      }

      // 4. Mocks for System-Deep Permissions
      // These usually require Intent checking or specific native bridge methods
      // for now we set them to false but keep them in the state for the UI.
      const batteryGranted = false;
      const alarmsGranted = true; // Assume true if we can schedule, logic varies by Android API level
      const overlayGranted = false;
      const accessibilityGranted = false;

      setPermissions({
        location: locStatus === "granted",
        camera: camStatus === "granted",
        notifications: notifGranted,
        alarms: alarmsGranted,
        battery: batteryGranted,
        overlay: overlayGranted,
        accessibility: accessibilityGranted,
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
