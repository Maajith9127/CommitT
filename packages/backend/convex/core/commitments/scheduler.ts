/**
 * Commitment Scheduler (Domain Logic)
 * 
 * Pure functions for calculating deadlines and time slots for Commitments.
 * 
 * @module core/commitments/scheduler
 */

import { Recurrence, NextTimeSlot, TimeWindow } from "../../types/domain/commitment";

const SECONDS_PER_DAY = 24 * 60 * 60;
const MS_PER_SECOND = 1000;
const MS_PER_DAY = SECONDS_PER_DAY * MS_PER_SECOND;

/**
 * Find the next scheduled time slot based on recurrence rules.
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

  // Normalize ISO-8601 day numbering (Mon=1..Sun=7) to JS convention (Sun=0..Sat=6)
  // The frontend may send 7 for Sunday, but getDay() returns 0 for Sunday.
  daysToCheck = daysToCheck.map(d => d === 7 ? 0 : d);

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

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function getStartOfDay(timestamp: number, timezoneOffset: number): number {
  const offsetMs = timezoneOffset * 60 * MS_PER_SECOND;
  const localDate = new Date(timestamp + offsetMs);
  localDate.setUTCHours(0, 0, 0, 0);
  return localDate.getTime() - offsetMs;
}

export function getSecondsFromMidnight(timestamp: number, timezoneOffset: number): number {
  const startOfDay = getStartOfDay(timestamp, timezoneOffset);
  return Math.floor((timestamp - startOfDay) / MS_PER_SECOND);
}

export function getDayOfWeek(timestamp: number, timezoneOffset: number): number {
  const offsetMs = timezoneOffset * 60 * MS_PER_SECOND;
  const localDate = new Date(timestamp + offsetMs);
  return localDate.getUTCDay();
}

export function timeWindowToTimestamp(
  dayStartTimestamp: number,
  secondsFromMidnight: number
): number {
  return dayStartTimestamp + secondsFromMidnight * MS_PER_SECOND;
}
