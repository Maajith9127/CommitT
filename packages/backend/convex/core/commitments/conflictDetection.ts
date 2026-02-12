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
 * Architecture:
 * - All functions are pure (no side effects, no DB access)
 * - Types are derived from Convex schema for type safety
 * - Fail-fast: returns first conflict found for performance
 * - Human-readable error messages for UI display
 *
 * @module lib/conflictDetection
 */

import type { Doc } from "../../_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents a time window with start and end in seconds from midnight.
 * Matches the schema: recurrence.time_windows[].{start, end}
 *
 * Examples:
 * - { start: 0, end: 3600 }       → 12:00 AM - 1:00 AM
 * - { start: 32400, end: 43200 }  → 9:00 AM - 12:00 PM
 * - { start: 64800, end: 75600 }  → 6:00 PM - 9:00 PM
 */
export type TimeWindow = {
  start: number; // seconds from midnight (0-86399)
  end: number;   // seconds from midnight (0-86400)
};

/**
 * Minimal task data needed for conflict detection.
 * Derived from Convex Doc<"tasks"> but only includes required fields.
 *
 * This allows the function to work with:
 * - New task drafts (before DB insertion)
 * - Existing tasks from DB queries
 */
export type TaskForConflictCheck = {
  _id?: string;
  assignee_id: string;
  title?: string;
  recurrence: {
    type: string;
    interval?: number;
    days_of_week?: number[];
    time_windows: TimeWindow[];
  };
};

/**
 * Detailed conflict information for error messages.
 * Provides enough context for meaningful UI feedback.
 */
export type ConflictDetails = {
  conflictingTaskId: string;
  conflictingTaskTitle: string;
  overlappingDays: number[];
  overlappingWindows: Array<{
    newWindow: TimeWindow;
    existingWindow: TimeWindow;
    day: number;
  }>;
};

/**
 * Result of conflict detection.
 * Discriminated union for type-safe handling.
 */
export type ConflictResult =
  | { hasConflict: false }
  | { hasConflict: true; details: ConflictDetails };

// ─────────────────────────────────────────────────────────────────────────────
// Core Pure Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find overlapping days between two arrays of weekday numbers.
 *
 * Days use JavaScript convention: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 *
 * @param daysA - First array of days
 * @param daysB - Second array of days
 * @returns Array of days that appear in both
 *
 * @example
 * getOverlappingDays([1, 3, 5], [1, 2])     // → [1] (Monday)
 * getOverlappingDays([0, 6], [1, 2, 3])    // → [] (no overlap)
 * getOverlappingDays([1, 2, 3], [3, 4, 5]) // → [3] (Wednesday)
 */
export function getOverlappingDays(
  daysA: number[] | undefined,
  daysB: number[] | undefined
): number[] {
  // Early return for undefined or empty arrays
  if (!daysA?.length || !daysB?.length) {
    return [];
  }

  // Use Set for O(n) lookup instead of O(n²)
  const setB = new Set(daysB);
  return daysA.filter((day) => setB.has(day));
}

/**
 * Check if two time windows overlap.
 *
 * Two windows overlap when: windowA.start < windowB.end AND windowB.start < windowA.end
 *
 * Edge case: Adjacent windows (e.g., 9-10 AM and 10-11 AM) do NOT overlap.
 * This allows users to schedule back-to-back commitments.
 *
 * @param windowA - First time window
 * @param windowB - Second time window
 * @returns true if windows overlap
 *
 * @example
 * // Overlap: 9-11 AM and 10-12 PM (10-11 AM overlaps)
 * windowsOverlap({ start: 32400, end: 39600 }, { start: 36000, end: 43200 }) // → true
 *
 * // No overlap: 9-10 AM and 11-12 PM
 * windowsOverlap({ start: 32400, end: 36000 }, { start: 39600, end: 43200 }) // → false
 *
 * // Adjacent (no overlap): 9-10 AM ends at 10, 10-11 AM starts at 10
 * windowsOverlap({ start: 32400, end: 36000 }, { start: 36000, end: 39600 }) // → false
 */
export function windowsOverlap(windowA: TimeWindow, windowB: TimeWindow): boolean {
  return windowA.start < windowB.end && windowB.start < windowA.end;
}

/**
 * Find all overlapping window pairs between two sets of time windows.
 *
 * @param windowsA - First array of time windows (new task)
 * @param windowsB - Second array of time windows (existing task)
 * @param day - The day these windows are being compared on (for error context)
 * @returns Array of overlapping window pairs with day context
 */
export function findOverlappingWindows(
  windowsA: TimeWindow[],
  windowsB: TimeWindow[],
  day: number
): Array<{ newWindow: TimeWindow; existingWindow: TimeWindow; day: number }> {
  const overlaps: Array<{ newWindow: TimeWindow; existingWindow: TimeWindow; day: number }> = [];

  for (const windowA of windowsA) {
    for (const windowB of windowsB) {
      if (windowsOverlap(windowA, windowB)) {
        overlaps.push({
          newWindow: windowA,
          existingWindow: windowB,
          day,
        });
      }
    }
  }

  return overlaps;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find scheduling conflicts between a new task and existing tasks.
 *
 * Algorithm:
 * 1. Skip tasks with no days (once-type) - no weekly recurrence to conflict
 * 2. Skip tasks with no time windows - nothing to conflict with
 * 3. For each existing task, check for overlapping days
 * 4. If days overlap, check for overlapping time windows
 * 5. Return FIRST conflict found (fail-fast for performance)
 *
 * @param newTask - The task being created/updated
 * @param existingTasks - Array of existing tasks for the same assignee
 * @param excludeTaskId - Optional task ID to exclude (for updates - don't conflict with self)
 * @returns ConflictResult with detailed info if conflict found
 *
 * @example
 * const result = findConflict(newTask, existingTasks);
 * if (result.hasConflict) {
 *   throw new ConvexError({
 *     code: "SCHEDULE_CONFLICT",
 *     message: formatConflictMessage(result.details),
 *   });
 * }
 */
export function findConflict(
  newTask: TaskForConflictCheck,
  existingTasks: Doc<"tasks">[],
  excludeTaskId?: string
): ConflictResult {
  // Extract scheduling data from new task
  const newDays = newTask.recurrence.days_of_week;
  const newWindows = newTask.recurrence.time_windows;

  // ─────────────────────────────────────────────────────────────────────────
  // Early returns for non-conflictable tasks
  // ─────────────────────────────────────────────────────────────────────────

  // No time windows = nothing can conflict
  if (!newWindows?.length) {
    return { hasConflict: false };
  }

  // No days = "once" type task, no weekly recurrence conflict
  // Future: Could add date-based conflict detection for one-time tasks
  if (!newDays?.length) {
    return { hasConflict: false };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Check each existing task for conflicts
  // ─────────────────────────────────────────────────────────────────────────

  for (const existing of existingTasks) {
    // Skip self (for update operations)
    if (excludeTaskId && existing._id === excludeTaskId) {
      continue;
    }

    // Skip tasks with no days (once-type tasks)
    const existingDays = existing.recurrence.days_of_week;
    if (!existingDays?.length) {
      continue;
    }

    // Skip tasks with no time windows
    const existingWindows = existing.recurrence.time_windows;
    if (!existingWindows?.length) {
      continue;
    }

    // Step 1: Check for overlapping days
    const overlappingDays = getOverlappingDays(newDays, existingDays);
    if (overlappingDays.length === 0) {
      continue; // No day overlap, skip to next task
    }

    // Step 2: Check for overlapping time windows on each overlapping day
    // (Time windows apply to ALL selected days, so we check once)
    const allOverlappingWindows: ConflictDetails["overlappingWindows"] = [];

    for (const day of overlappingDays) {
      const dayOverlaps = findOverlappingWindows(newWindows, existingWindows, day);
      allOverlappingWindows.push(...dayOverlaps);
    }

    if (allOverlappingWindows.length > 0) {
      // CONFLICT FOUND!
      return {
        hasConflict: true,
        details: {
          conflictingTaskId: existing._id,
          conflictingTaskTitle: existing.title || "Untitled Commitment",
          overlappingDays,
          overlappingWindows: allOverlappingWindows,
        },
      };
    }
  }

  // No conflicts found
  return { hasConflict: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format seconds from midnight to human-readable time string.
 *
 * @example
 * formatTime(0)      // → "12:00 AM"
 * formatTime(32400)  // → "9:00 AM"
 * formatTime(43200)  // → "12:00 PM"
 * formatTime(75600)  // → "9:00 PM"
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Format a time window range for display.
 *
 * @example
 * formatWindowRange({ start: 32400, end: 39600 }) // → "9:00 AM - 11:00 AM"
 */
export function formatWindowRange(window: TimeWindow): string {
  return `${formatTime(window.start)} - ${formatTime(window.end)}`;
}

/**
 * Get day name from number.
 *
 * @example
 * getDayName(0) // → "Sunday"
 * getDayName(1) // → "Monday"
 */
export function getDayName(day: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day] ?? `Day ${day}`;
}

/**
 * Get short day name from number.
 *
 * @example
 * getDayShortName(0) // → "Sun"
 * getDayShortName(1) // → "Mon"
 */
export function getDayShortName(day: number): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[day] ?? `D${day}`;
}

/**
 * Format overlapping days for display.
 *
 * @example
 * formatDays([1, 3, 5])        // → "Monday, Wednesday, Friday"
 * formatDays([1, 3, 5], true)  // → "Mon, Wed, Fri"
 */
export function formatDays(days: number[], short = false): string {
  const formatter = short ? getDayShortName : getDayName;
  return days.map(formatter).join(", ");
}

/**
 * Build a user-friendly conflict error message.
 *
 * This is the main function to use when displaying errors to users.
 * It creates a clear, actionable message explaining the conflict.
 *
 * @param details - Conflict details from findConflict()
 * @returns Human-readable error message
 *
 * @example
 * // Single overlap
 * 'Conflicts with "Morning Run" on Monday (6:00 AM - 8:00 AM overlaps with 7:00 AM - 9:00 AM)'
 *
 * // Multiple overlaps
 * 'Conflicts with "Morning Run" on Mon, Wed, Fri. 2 time slots overlap.'
 */
export function formatConflictMessage(details: ConflictDetails): string {
  const { conflictingTaskTitle, overlappingDays, overlappingWindows } = details;

  // Case 1: Simple conflict (Single day, single overlap)
  if (overlappingDays.length === 1 && overlappingWindows.length === 1) {
    const day = getDayName(overlappingDays[0]);
    const overlap = overlappingWindows[0];
    const newTime = formatWindowRange(overlap.newWindow);
    const existingTime = formatWindowRange(overlap.existingWindow);
    
    return `Conflicts with "${conflictingTaskTitle}" on ${day}. Your time (${newTime}) overlaps with existing time (${existingTime}).`;
  }

  // Case 2: Complex conflict (Multiple days or overlaps)
  const daysText = formatDays(overlappingDays, overlappingDays.length > 3);
  const overlapCount = overlappingWindows.length;
  const slotWord = overlapCount === 1 ? "time slot" : "time slots";

  return `Conflicts with "${conflictingTaskTitle}" on ${daysText}. ${overlapCount} ${slotWord} overlap.`;
}

/**
 * Build a detailed conflict error message with all overlapping times.
 *
 * Use this for debugging or detailed error views.
 *
 * @param details - Conflict details from findConflict()
 * @returns Detailed multi-line error message
 */
export function formatConflictMessageDetailed(details: ConflictDetails): string {
  const { conflictingTaskTitle, overlappingDays, overlappingWindows } = details;

  const lines = [
    `Schedule conflict with "${conflictingTaskTitle}"`,
    ``,
    `Conflicting days: ${formatDays(overlappingDays)}`,
    ``,
    `Overlapping times:`,
  ];

  for (const overlap of overlappingWindows) {
    const day = getDayShortName(overlap.day);
    lines.push(
      `  • ${day}: ${formatWindowRange(overlap.newWindow)} conflicts with ${formatWindowRange(overlap.existingWindow)}`
    );
  }

  return lines.join("\n");
}
