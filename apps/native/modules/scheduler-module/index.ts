import { requireNativeModule } from "expo-modules-core";

/**
 * SchedulerModule - Native alarm scheduling chain.
 *
 * Uses Android AlarmManager for OS-level scheduling that survives:
 * - App being swiped away / killed
 * - Phone restart (via BootReceiver)
 *
 * Flow:
 *   JS → SchedulerModule → AlarmScheduler → AlarmManager
 *     → AlarmReceiver → AlarmActivity (overlay + sound + vibration)
 *     → User taps DISMISS → chains next alarm automatically
 */
const SchedulerModule = requireNativeModule("SchedulerModule");

export function scheduleForTask(convexId: string): any {
  return SchedulerModule.scheduleForTask(convexId);
}

export function rescheduleForTask(convexId: string): any {
  return SchedulerModule.rescheduleForTask(convexId);
}

export function cancelForTask(convexId: string): any {
  return SchedulerModule.cancelForTask(convexId);
}

export function scheduleNextAlarm(): { success: boolean; error?: string } {
  return SchedulerModule.scheduleNextAlarm();
}
