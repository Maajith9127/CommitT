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

export interface ScheduleResult {
  success: boolean;
  taskTitle?: string;
  nextAlarmMs?: number;
  nextAlarmReadable?: string;
  delayMs?: number;
  alarmId?: number;
  error?: string;
}

/**
 * CREATE: Schedule the next alarm for a task.
 * Reads recurrence from local DB, calculates next time slot,
 * sets an AlarmManager alarm, and persists to scheduled_alarms table.
 */
export function scheduleForTask(convexId: string): ScheduleResult {
  return SchedulerModule.scheduleForTask(convexId);
}

/**
 * UPDATE: Cancel existing alarm chain and start a new one.
 * Call after updating a task's recurrence rules in the local DB.
 */
export function rescheduleForTask(convexId: string): ScheduleResult {
  return SchedulerModule.rescheduleForTask(convexId);
}

/**
 * DELETE: Cancel all alarms for a task.
 * Call before/after deleting the task from the DB.
 */
export function cancelForTask(
  convexId: string
): { success: boolean; cancelled?: string; error?: string } {
  return SchedulerModule.cancelForTask(convexId);
}
