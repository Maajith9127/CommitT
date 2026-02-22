import { requireNativeModule } from "expo-modules-core";

/**
 * SchedulerModule - Native Android alarm scheduling abstraction.
 *
 * Utilizes the Android OS AlarmManager framework for persistent, system-level
 * background scheduling that is inherently resilient against:
 * - Application lifecycle termination (e.g., swiping away the app)
 * - Device physical restarts (managed via BootReceiver and Direct Boot lock states)
 *
 * Execution Chain:
 *   JS Context -> SchedulerModule (Bridge) -> AlarmScheduler (SQLite/DPS)
 *   -> OS AlarmManager -> AlarmReceiver -> AlarmActivity
 */
const SchedulerModule = requireNativeModule("SchedulerModule");

/**
 * Commands the native module to synchronize its execution queue using the overarching SQLite file.
 * The system automatically identifies the very next chronological instance and pushes it to
 * the OS hardware clock, syncing up to 20 instances to the fallback Direct Boot cache.
 */
export function scheduleNextAlarm(): { success: boolean; error?: string } {
  return SchedulerModule.scheduleNextAlarm();
}
