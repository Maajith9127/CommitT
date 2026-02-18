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

/**
 * Read all tasks from the local SQLite database (commit.db).
 * Returns an array of task objects with all columns.
 */
export function getLocalTasks(): Record<string, any>[] {
  return AlarmModule.getLocalTasks();
}

/**
 * Read tasks from local DB and show their titles as a native Toast.
 */
export function showTasksToast(): void {
  AlarmModule.showTasksToast();
}
