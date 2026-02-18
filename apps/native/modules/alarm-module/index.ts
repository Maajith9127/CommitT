import { requireNativeModule } from "expo-modules-core";

/**
 * AlarmModule - Native bridge for alarm/toast functionality.
 *
 * This uses the modern Expo Modules API (auto-linked, type-safe).
 * The native Kotlin implementation lives in:
 *   modules/alarm-module/android/src/main/java/expo/modules/alarm/AlarmModule.kt
 */
const AlarmModule = requireNativeModule("AlarmModule");

/**
 * Show a native Android Toast message.
 */
export function showToast(message: string): void {
  AlarmModule.showToast(message);
}
