import JailMonkey from 'jail-monkey';
import { requireNativeModule } from 'expo-modules-core';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from "react";
import { AppState, type AppStateStatus, View } from "react-native";
import { HeaderTitle, BodyText } from "@/components/ui/text";

/**
 * Native bridge to the BlockerModule for hardened USB debugging detection.
 * JailMonkey only checks if the Developer Options *menu* is visible.
 * This native call reads `Settings.Global.ADB_ENABLED` directly,
 * catching the "ghost ADB" attack where the menu is hidden but
 * USB debugging remains active.
 */
const BlockerNative = requireNativeModule('Blocker');

/**
 * SecurityShield
 * 
 * Hardware Execution Shield designed to interrogate the Android OS for rooted
 * environments, location spoofing tools, active developer options, and
 * USB debugging (ADB). If a breach is detected in production, the
 * application halts execution.
 */
export function SecurityShield({ children }: { children: React.ReactNode }) {
  const [isSecure, setIsSecure] = useState(true);

  useEffect(() => {
    async function runHardwareChecks() {
      // Bypass rigorous hardware checks on local development environments
      if (!__DEV__) {
        try {
          const isJailBroken = JailMonkey.isJailBroken();
          const canMockLocation = JailMonkey.canMockLocation();
          const isDevModeOn = await JailMonkey.isDevelopmentSettingsMode();
          
          /**
           * ** Hardened ADB Detection (April 2026) **
           *
           * A user can hide Developer Options via:
           *   `adb shell settings put global development_settings_enabled 0`
           * which makes JailMonkey's isDevelopmentSettingsMode() return false,
           * while USB debugging (ADB) remains fully operational. This "ghost ADB"
           * state allows remote database manipulation, service kills, and
           * commitment bypasses via a connected computer.
           *
           * This native call reads Settings.Global.ADB_ENABLED directly from
           * the Android system database, detecting the actual daemon state
           * regardless of menu visibility.
           */
          let isUsbDebugging = false;
          try {
            isUsbDebugging = BlockerNative.isUsbDebuggingEnabled();
          } catch (e) {
            console.warn("[SecurityShield] USB debugging check unavailable", e);
          }
          
          if (isJailBroken || canMockLocation || isDevModeOn || isUsbDebugging) {
            console.error(`[Security Violation] Boot blocked: JailBroken:${isJailBroken} | LocationMocked:${canMockLocation} | DevMode:${isDevModeOn} | UsbDebug:${isUsbDebugging}`);
            setIsSecure(false);
          } else {
            // If they turned off the hack and came back, release the lock
            setIsSecure(true);
          }
        } catch (e) {
          console.warn("[SecurityShield] Hardware interrogation failed", e);
        }
      }
    }
    
    // Run on initial boot
    runHardwareChecks();

    // Listen for the app coming back from the background
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        runHardwareChecks();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Kill the standard rendering thread and lock the app into this generic screen
  if (!isSecure) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <MaterialCommunityIcons name="shield-alert-outline" size={80} color="#FF3B30" style={{ marginBottom: 20 }} />
        <HeaderTitle className="text-[#FF3B30] text-2xl font-bold text-center mb-3">
          Security Violation
        </HeaderTitle>
        <BodyText className="text-gray-400 text-center text-base" style={{ lineHeight: 24 }}>
          This application has detected unauthorized hardware configuration. It cannot execute natively while Developer Settings, USB Debugging, or Location Spoofing protocols are active on this device.
        </BodyText>
      </View>
    );
  }

  return <>{children}</>;
}
