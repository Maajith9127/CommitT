/**
 * Conflict Detection Module
 *
 * Pure functions for detecting scheduling conflicts between tasks.
 * Used by task mutations to prevent overlapping commitments.
 *
 * A conflict occurs when:
 * 1. Same assignee (user)
 * 2. Overlapping days of the week
 * 3. Overlapping time slots on those days
 *
 * @module lib/conflictDetection
 */

import type { Doc } from "../_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents a time slot with start and end in seconds from midnight.
 * 0 = midnight, 32400 = 9:00 AM, 43200 = 12:00 PM, etc.
 */
export type TimeSlot = {
  start: number;
  end: number;
};

/**
 * Minimal task data needed for conflict detection.
 * Can be a new task draft or an existing task from DB.
 */
export type TaskForConflictCheck = {
  _id?: string;
  assignee_id: string;
  title?: string;
  recurrence: {
    type: string;
    days_of_week?: number[];
  };
  conditions: Array<{
    metric_key: string;
    relation: string;
    target: {
      type: string;
      value: any;
    };
  }>;
};

/**
 * Result of conflict detection.
 */
export type ConflictResult =
  | { hasConflict: false }
  | {
      hasConflict: true;
      conflictingTaskId: string;
      conflictingTaskTitle: string;
      overlappingDays: number[];
      overlappingSlots: Array<{
        newSlot: TimeSlot;
        existingSlot: TimeSlot;
      }>;
    };

// ─────────────────────────────────────────────────────────────────────────────
// Core Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find overlapping days between two arrays of weekday numbers.
 *
 * @param daysA - First array of days (0 = Sunday, 1 = Monday, etc.)
 * @param daysB - Second array of days
 * @returns Array of days that appear in both
 *
 * @example
 * getOverlappingDays([1, 3, 5], [1, 2]) // → [1] (Monday)
 * getOverlappingDays([0, 6], [1, 2, 3]) // → [] (no overlap)
 */
export function getOverlappingDays(
  daysA: number[] | undefined,
  daysB: number[] | undefined
): number[] {
  if (!daysA || !daysB || daysA.length === 0 || daysB.length === 0) {
    return [];
  }

  const setB = new Set(daysB);
  return daysA.filter((day) => setB.has(day));
}

/**
 * Check if two time slots overlap.
 *
 * Two slots overlap when: slotA.start < slotB.end AND slotB.start < slotA.end
 *
 * @param slotA - First time slot
 * @param slotB - Second time slot
 * @returns true if slots overlap
 *
 * @example
 * // 9-11 AM and 10-12 PM → overlap (10-11 AM)
 * slotsOverlap({ start: 32400, end: 39600 }, { start: 36000, end: 43200 }) // → true
 *
 * // 9-10 AM and 11-12 PM → no overlap
 * slotsOverlap({ start: 32400, end: 36000 }, { start: 39600, end: 43200 }) // → false
 *
 * // Adjacent slots (10 AM end, 10 AM start) → no overlap (edge case)
 * slotsOverlap({ start: 32400, end: 36000 }, { start: 36000, end: 39600 }) // → false
 */
export function slotsOverlap(slotA: TimeSlot, slotB: TimeSlot): boolean {
  return slotA.start < slotB.end && slotB.start < slotA.end;
}

/**
 * Extract time slots from task conditions.
 *
 * Looks for conditions with:
 * - metric_key: "time"
 * - relation: "range"
 * - target.value: array of { start, end } objects
 *
 * @param conditions - Array of task conditions
 * @returns Array of time slots, or empty array if none found
 */
export function extractTimeSlots(
  conditions: TaskForConflictCheck["conditions"]
): TimeSlot[] {
  const timeCondition = conditions.find(
    (c) => c.metric_key === "time" && c.relation === "range"
  );

  if (!timeCondition || !Array.isArray(timeCondition.target?.value)) {
    return [];
  }

  // Validate and extract slots
  return timeCondition.target.value
    .filter(
      (slot: any) =>
        typeof slot === "object" &&
        typeof slot.start === "number" &&
        typeof slot.end === "number"
    )
    .map((slot: any) => ({
      start: slot.start,
      end: slot.end,
    }));
}

/**
 * Find all overlapping slot pairs between two sets of time slots.
 *
 * @param slotsA - First array of time slots
 * @param slotsB - Second array of time slots
 * @returns Array of overlapping slot pairs
 */
export function findOverlappingSlots(
  slotsA: TimeSlot[],
  slotsB: TimeSlot[]
): Array<{ newSlot: TimeSlot; existingSlot: TimeSlot }> {
  const overlaps: Array<{ newSlot: TimeSlot; existingSlot: TimeSlot }> = [];

  for (const slotA of slotsA) {
    for (const slotB of slotsB) {
      if (slotsOverlap(slotA, slotB)) {
        overlaps.push({ newSlot: slotA, existingSlot: slotB });
      }
    }
  }

  return overlaps;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find conflicts between a new task and existing tasks.
 *
 * A conflict exists when:
 * 1. Tasks have overlapping days of the week
 * 2. Time slots overlap on those days
 *
 * Returns the FIRST conflict found (fail-fast for performance).
 *
 * @param newTask - The task being created/updated
 * @param existingTasks - Array of existing tasks for the same assignee
 * @param excludeTaskId - Optional task ID to exclude (for updates)
 * @returns ConflictResult with details if conflict found
 *
 * @example
 * const result = findConflict(newTask, existingTasks);
 * if (result.hasConflict) {
 *   throw new ConvexError({
 *     code: "SCHEDULE_CONFLICT",
 *     message: `Conflicts with "${result.conflictingTaskTitle}"`,
 *   });
 * }
 */
export function findConflict(
  newTask: TaskForConflictCheck,
  existingTasks: Doc<"tasks">[],
  excludeTaskId?: string
): ConflictResult {
  // Extract data from new task
  const newDays = newTask.recurrence.days_of_week;
  const newSlots = extractTimeSlots(newTask.conditions);

  // No time slots = no possible conflict (edge case)
  if (newSlots.length === 0) {
    return { hasConflict: false };
  }

  // No days = "once" type, no weekly recurrence conflict
  // (For "once" tasks, we might need date-based conflict detection in future)
  if (!newDays || newDays.length === 0) {
    return { hasConflict: false };
  }

  // Check each existing task
  for (const existing of existingTasks) {
    // Skip self (for update operations)
    if (excludeTaskId && existing._id === excludeTaskId) {
      continue;
    }

    // Skip tasks with no days (once-type tasks)
    const existingDays = existing.recurrence.days_of_week;
    if (!existingDays || existingDays.length === 0) {
      continue;
    }

    // Step 1: Check for overlapping days
    const overlappingDays = getOverlappingDays(newDays, existingDays);
    if (overlappingDays.length === 0) {
      continue; // No day overlap, skip to next task
    }

    // Step 2: Extract time slots from existing task
    const existingSlots = extractTimeSlots(existing.conditions);
    if (existingSlots.length === 0) {
      continue; // No time slots in existing task, skip
    }

    // Step 3: Check for overlapping time slots
    const overlappingSlots = findOverlappingSlots(newSlots, existingSlots);
    if (overlappingSlots.length > 0) {
      // CONFLICT FOUND!
      return {
        hasConflict: true,
        conflictingTaskId: existing._id,
        conflictingTaskTitle: existing.title || "Untitled Task",
        overlappingDays,
        overlappingSlots,
      };
    }
  }

  // No conflicts found
  return { hasConflict: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions (for debugging/logging)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format seconds from midnight to human-readable time string.
 * Useful for error messages.
 *
 * @example
 * formatTimeSlot(32400) // → "9:00 AM"
 * formatTimeSlot(43200) // → "12:00 PM"
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Format a time slot range for display.
 *
 * @example
 * formatSlotRange({ start: 32400, end: 39600 }) // → "9:00 AM - 11:00 AM"
 */
export function formatSlotRange(slot: TimeSlot): string {
  return `${formatTime(slot.start)} - ${formatTime(slot.end)}`;
}

/**
 * Get day name from number.
 *
 * @example
 * getDayName(1) // → "Monday"
 */
export function getDayName(day: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day] || `Day ${day}`;
}

/**
 * Format overlapping days for display.
 *
 * @example
 * formatOverlappingDays([1, 3, 5]) // → "Monday, Wednesday, Friday"
 */
export function formatOverlappingDays(days: number[]): string {
  return days.map(getDayName).join(", ");
}
