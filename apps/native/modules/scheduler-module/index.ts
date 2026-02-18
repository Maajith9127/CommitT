import { requireNativeModule } from "expo-modules-core";

/**
 * SchedulerModule - Native scheduling chain for tasks.
 *
 * Each task gets its own self-perpetuating chain:
 *   Toast fires → calculate next slot → schedule next toast → repeat
 *
 * Lifecycle:
 *   CREATE → scheduleForTask(convexId)     — starts the chain
 *   UPDATE → rescheduleForTask(convexId)   — cancels old chain + starts new
 *   DELETE → cancelForTask(convexId)       — cancels the chain
 */
const SchedulerModule = requireNativeModule("SchedulerModule");

export interface ScheduleResult {
  success: boolean;
  taskTitle?: string;
  nextAlarmMs?: number;
  nextAlarmReadable?: string;
  delayMs?: number;
  dayOfWeek?: number;
  activeChainsCount?: number;
  error?: string;
}

/**
 * CREATE: Start a new scheduling chain for a task.
 * Reads recurrence from local DB, calculates next slot, schedules toast.
 * When toast fires, chains to the next slot automatically.
 */
export function scheduleForTask(convexId: string): ScheduleResult {
  return SchedulerModule.scheduleForTask(convexId);
}

/**
 * UPDATE: Cancel the existing chain and start a new one.
 * Call this after updating a task's recurrence rules.
 */
export function rescheduleForTask(convexId: string): ScheduleResult {
  return SchedulerModule.rescheduleForTask(convexId);
}

/**
 * DELETE: Cancel and remove the chain for a task.
 * Call this before/after deleting the task from the DB.
 */
export function cancelForTask(convexId: string): { success: boolean; cancelled: string } {
  return SchedulerModule.cancelForTask(convexId);
}

/**
 * DEBUG: Get all currently active chain IDs (convex_ids).
 */
export function getActiveChains(): string[] {
  return SchedulerModule.getActiveChains();
}
