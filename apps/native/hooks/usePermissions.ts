import { useState, useEffect } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import { NativeModulesProxy, requireNativeModule } from "expo-modules-core";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";

// Safely require the Blocker module from the native side.
// We do this outside the hook to keep it singleton-like.
let BlockerModule: any = null;
try {
  BlockerModule = requireNativeModule("Blocker");
} catch (e) {
  console.warn("[usePermissions] Native Blocker module not found. Some checks will be skipped.");
}

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

      // 4. System-Deep Permissions
      let accessibilityGranted = false;
      let overlayGranted = false;
      let batteryGranted = false;
      let alarmsGranted = true;

      if (Platform.OS === "android") {
        try {
          console.log("[usePermissions] Blocker Module Found:", !!BlockerModule);
          
          if (BlockerModule) {
            // Check Accessibility
            if (typeof BlockerModule.isAccessibilityServiceEnabled === "function") {
              accessibilityGranted = await BlockerModule.isAccessibilityServiceEnabled();
              console.log("[usePermissions] Accessibility Native Result:", accessibilityGranted);
            }

            // Check Overlay (Appear on top)
            if (typeof BlockerModule.isOverlayPermissionEnabled === "function") {
              overlayGranted = await BlockerModule.isOverlayPermissionEnabled();
              console.log("[usePermissions] Overlay Native Result:", overlayGranted);
            }
          }
        } catch (e) {
          console.error("[usePermissions] Native permission check failed:", e);
        }
      }

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
