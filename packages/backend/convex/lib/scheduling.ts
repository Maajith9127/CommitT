/**
 * Scheduling Utilities
 *
 * Functions to calculate next occurrences from recurrence rules and schedule
 * task verification checks.
 *
 * @module lib/scheduling
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Time window in seconds from midnight */
export interface TimeWindow {
  start: number; // seconds from midnight
  end: number; // seconds from midnight
}

/** Recurrence configuration */
export interface Recurrence {
  type: "once" | "daily" | "weekly" | "monthly" | "yearly" | "custom";
  interval: number;
  days_of_week?: number[]; // 0 = Sunday, 1 = Monday, etc.
  time_windows: TimeWindow[];
  ends?: {
    type: "never" | "after" | "on"; // Matches recurrenceEndsTypeEnum
    count?: number;
    date?: number;
  };
}

/** Result of finding the next scheduled time slot */
export interface NextTimeSlot {
  /** Unix timestamp (ms) when the time slot starts */
  startTime: number;
  /** Unix timestamp (ms) when the time slot ends */
  endTime: number;
  /** Day of week (0-6) this slot falls on */
  dayOfWeek: number;
  /** The time window that matched */
  timeWindow: TimeWindow;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SECONDS_PER_DAY = 24 * 60 * 60;
const MS_PER_SECOND = 1000;
const MS_PER_DAY = SECONDS_PER_DAY * MS_PER_SECOND;

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the start of day (midnight) for a given timestamp in a specific timezone.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @param timezoneOffset - Timezone offset in minutes (e.g., +330 for IST)
 * @returns Unix timestamp of midnight in that timezone
 */
export function getStartOfDay(timestamp: number, timezoneOffset: number): number {
  // Convert offset from minutes to milliseconds
  const offsetMs = timezoneOffset * 60 * MS_PER_SECOND;

  // Get the date adjusted for timezone
  const localDate = new Date(timestamp + offsetMs);
  localDate.setUTCHours(0, 0, 0, 0);

  // Return the UTC timestamp of midnight in that timezone
  return localDate.getTime() - offsetMs;
}

/**
 * Get seconds elapsed since midnight for a given timestamp.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @param timezoneOffset - Timezone offset in minutes
 * @returns Seconds since midnight
 */
export function getSecondsFromMidnight(timestamp: number, timezoneOffset: number): number {
  const startOfDay = getStartOfDay(timestamp, timezoneOffset);
  return Math.floor((timestamp - startOfDay) / MS_PER_SECOND);
}

/**
 * Get the day of week (0-6) for a given timestamp in a specific timezone.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @param timezoneOffset - Timezone offset in minutes
 * @returns Day of week (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeek(timestamp: number, timezoneOffset: number): number {
  const offsetMs = timezoneOffset * 60 * MS_PER_SECOND;
  const localDate = new Date(timestamp + offsetMs);
  return localDate.getUTCDay();
}

/**
 * Convert a time window (seconds from midnight) to an absolute timestamp.
 *
 * @param dayStartTimestamp - Unix timestamp of midnight (ms)
 * @param secondsFromMidnight - Seconds from midnight
 * @returns Unix timestamp (ms)
 */
export function timeWindowToTimestamp(
  dayStartTimestamp: number,
  secondsFromMidnight: number
): number {
  return dayStartTimestamp + secondsFromMidnight * MS_PER_SECOND;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the next scheduled time slot based on recurrence rules.
 *
 * This function calculates when the next task verification should occur
 * based on the current time and the task's recurrence configuration.
 *
 * @param recurrence - The recurrence configuration
 * @param currentTime - Current Unix timestamp (ms), defaults to now
 * @param timezoneOffset - User's timezone offset in minutes (e.g., +330 for IST)
 * @returns The next time slot, or null if no valid slot exists
 *
 * @example
 * ```ts
 * const next = findNextTimeSlot(
 *   { type: "weekly", interval: 1, days_of_week: [1, 3, 5], time_windows: [{ start: 21600, end: 28800 }] },
 *   Date.now(),
 *   330 // IST offset
 * );
 * // Returns: { startTime: 1234567890, endTime: 1234574890, dayOfWeek: 1, ... }
 * ```
 */
export function findNextTimeSlot(
  recurrence: Recurrence,
  currentTime: number = Date.now(),
  timezoneOffset: number = 0
): NextTimeSlot | null {
  // Validate input
  if (!recurrence.time_windows || recurrence.time_windows.length === 0) {
    return null;
  }

  const { type, days_of_week, time_windows } = recurrence;

  // Sort time windows by start time
  const sortedWindows = [...time_windows].sort((a, b) => a.start - b.start);

  // Get current time context
  const currentDayOfWeek = getDayOfWeek(currentTime, timezoneOffset);
  const currentSecondsFromMidnight = getSecondsFromMidnight(currentTime, timezoneOffset);
  const todayStart = getStartOfDay(currentTime, timezoneOffset);

  // Determine which days to check based on recurrence type
  let daysToCheck: number[] = [];

  switch (type) {
    case "once":
    case "daily":
      // Check all days of the week
      daysToCheck = [0, 1, 2, 3, 4, 5, 6];
      break;

    case "weekly":
      // Use specified days, or default to all days if not specified
      daysToCheck = days_of_week && days_of_week.length > 0 ? [...days_of_week].sort() : [0, 1, 2, 3, 4, 5, 6];
      break;

    case "monthly":
    case "yearly":
      // For monthly/yearly, we'd need more complex date logic - for now treat as daily
      daysToCheck = [0, 1, 2, 3, 4, 5, 6];
      break;

    case "custom":
      // For custom, use specified days or default to all
      daysToCheck = days_of_week && days_of_week.length > 0 ? [...days_of_week].sort() : [0, 1, 2, 3, 4, 5, 6];
      break;
  }

  // Search for the next valid time slot
  // We'll check up to 7 days ahead (one full week cycle)
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const checkDayOfWeek = (currentDayOfWeek + dayOffset) % 7;

    // Skip if this day isn't in the allowed days
    if (!daysToCheck.includes(checkDayOfWeek)) {
      continue;
    }

    // Calculate the start of the day we're checking
    const checkDayStart = todayStart + dayOffset * MS_PER_DAY;

    // Check each time window for this day
    for (const window of sortedWindows) {
      const windowStartTime = timeWindowToTimestamp(checkDayStart, window.start);
      const windowEndTime = timeWindowToTimestamp(checkDayStart, window.end);

      // If this is today, skip windows that have already ended
      if (dayOffset === 0 && window.end <= currentSecondsFromMidnight) {
        continue;
      }

      // Found a valid time slot!
      return {
        startTime: windowStartTime,
        endTime: windowEndTime,
        dayOfWeek: checkDayOfWeek,
        timeWindow: window,
      };
    }
  }

  // No valid slot found in the next week
  return null;
}

/**
 * Calculate the delay in milliseconds until a scheduled time.
 *
 * @param targetTime - Target Unix timestamp (ms)
 * @param currentTime - Current Unix timestamp (ms), defaults to now
 * @returns Delay in milliseconds, or 0 if target is in the past
 */
export function calculateDelay(targetTime: number, currentTime: number = Date.now()): number {
  const delay = targetTime - currentTime;
  return Math.max(0, delay);
}

/**
 * Format a time slot for logging/debugging.
 *
 * @param slot - The time slot to format
 * @returns Human-readable string
 */
export function formatTimeSlot(slot: NextTimeSlot): string {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const startDate = new Date(slot.startTime);
  const endDate = new Date(slot.endTime);

  return `${dayNames[slot.dayOfWeek]} ${startDate.toISOString()} - ${endDate.toISOString()}`;
}
