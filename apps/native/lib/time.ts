/**
 * Time Utilities
 *
 * Pure functions for converting between time formats.
 * Used throughout the app for consistent time handling.
 *
 * Time is stored as "seconds from midnight" (0-86399) because:
 * - Easy to compare and sort
 * - No timezone issues for relative times
 * - Simple math for overlap detection
 */

export type TimePeriod = "AM" | "PM";

export type TimeInput = {
  hour: number;   // 1-12 (12-hour format)
  minute: number; // 0-59
  period: TimePeriod;
};

/**
 * Convert 12-hour time to seconds from midnight.
 *
 * @example
 * timeToSeconds(6, 30, "AM")  // → 23400 (6:30 AM)
 * timeToSeconds(12, 0, "PM")  // → 43200 (12:00 PM / noon)
 * timeToSeconds(12, 0, "AM")  // → 0 (12:00 AM / midnight)
 */
export function timeToSeconds(hour: number, minute: number, period: TimePeriod): number {
  // Convert 12-hour to 24-hour
  let h24 = hour % 12;
  if (period === "PM") {
    h24 += 12;
  }
  return h24 * 3600 + minute * 60;
}

/**
 * Convert TimeInput object to seconds from midnight.
 * Convenience wrapper around timeToSeconds.
 *
 * @example
 * timeInputToSeconds({ hour: 9, minute: 0, period: "AM" })  // → 32400
 */
export function timeInputToSeconds(input: TimeInput): number {
  return timeToSeconds(input.hour, input.minute, input.period);
}

/**
 * Convert seconds from midnight to display format (e.g., "9:30 am").
 *
 * @example
 * secondsToDisplay(32400)  // → "9:00 am"
 * secondsToDisplay(43200)  // → "12:00 pm"
 * secondsToDisplay(0)      // → "12:00 am"
 */
export function secondsToDisplay(totalSeconds: number): string {
  const h24 = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const period = h24 >= 12 ? "pm" : "am";
  const hour12 = h24 % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Convert seconds from midnight to TimeInput object.
 * Useful for populating time picker with existing value.
 *
 * @example
 * secondsToTimeInput(32400)  // → { hour: 9, minute: 0, period: "AM" }
 */
export function secondsToTimeInput(totalSeconds: number): TimeInput {
  const h24 = Math.floor(totalSeconds / 3600);
  const minute = Math.floor((totalSeconds % 3600) / 60);
  const period: TimePeriod = h24 >= 12 ? "PM" : "AM";
  const hour = h24 % 12 || 12;
  return { hour, minute, period };
}

/**
 * Format a time range for display.
 *
 * @example
 * formatTimeRange(32400, 36000)  // → "9:00 am - 10:00 am"
 */
export function formatTimeRange(startSeconds: number, endSeconds: number): string {
  return `${secondsToDisplay(startSeconds)} - ${secondsToDisplay(endSeconds)}`;
}

/**
 * Formats a millisecond duration into a human-readable "relative" string.
 * Switches precision based on the magnitude of the duration.
 * 
 * Logic:
 * - > 24h: show "Xd Yh"
 * - 1h - 24h: show "Xh Ym"
 * - < 1h: show "Xm Ys"
 * 
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "2d 5h", "1h 30m", "45m 12s")
 */
export function formatRelativeDuration(ms: number): string {
  if (ms <= 0) return "0s";

  const SEC = 1000;
  const MIN = 60 * SEC;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  if (ms >= DAY) {
    const d = Math.floor(ms / DAY);
    const h = Math.floor((ms % DAY) / HOUR);
    return `${d}d ${h}h`;
  }

  if (ms >= HOUR) {
    const h = Math.floor(ms / HOUR);
    const m = Math.floor((ms % HOUR) / MIN);
    return `${h}h ${m}m`;
  }

  const m = Math.floor(ms / MIN);
  const s = Math.floor((ms % MIN) / SEC);
  return `${m}m ${s}s`;
}
