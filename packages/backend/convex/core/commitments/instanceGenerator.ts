/**
 * Instance Generator (Domain Logic)
 * 
 * Pure function for generating all time slots for a task over a given horizon.
 * Uses the existing findNextTimeSlot logic in a loop.
 * 
 * @module core/commitments/instanceGenerator
 */

import { Recurrence } from "../../types/domain/commitment";
import { findNextTimeSlot } from "./scheduler";

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

export interface GeneratedSlot {
  startTime: number;
  endTime: number;
}

/**
 * Generate all time slots for a recurrence rule from `fromTime` up to `horizon`.
 * 
 * - Respects `ends.type === "after"` (count limit)
 * - Respects `ends.type === "on"` (end date)
 * - Caps at the provided horizon (default: 1 year from fromTime)
 * 
 * @returns Array of { startTime, endTime } sorted chronologically
 */
export function generateTimeSlots(
  recurrence: Recurrence,
  fromTime: number,
  timezoneOffset: number = 0,
  horizonMs: number = MS_PER_YEAR,
): GeneratedSlot[] {
  const slots: GeneratedSlot[] = [];
  const horizonEnd = fromTime + horizonMs;

  // Track remaining count for "after" type endings
  let remainingCount: number | null = null;
  if (recurrence.ends?.type === "after" && recurrence.ends.count !== undefined) {
    remainingCount = recurrence.ends.count;
  }

  // Track end date for "on" type endings
  const endDate: number | null = 
    recurrence.ends?.type === "on" && recurrence.ends.date !== undefined
      ? recurrence.ends.date
      : null;

  let cursor = fromTime;

  // Safety limit to prevent infinite loops (max ~2000 instances per year is very generous)
  const MAX_ITERATIONS = 2000;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // Check count limit
    if (remainingCount !== null && remainingCount <= 0) {
      break;
    }

    const nextSlot = findNextTimeSlot(recurrence, cursor, timezoneOffset);

    if (!nextSlot) {
      // No more slots found within a week — done
      break;
    }

    // Check horizon
    if (nextSlot.startTime >= horizonEnd) {
      break;
    }

    // Check end date
    if (endDate !== null && nextSlot.startTime > endDate) {
      break;
    }

    slots.push({
      startTime: nextSlot.startTime,
      endTime: nextSlot.endTime,
    });

    // Decrement count
    if (remainingCount !== null) {
      remainingCount--;
    }

    // Move cursor past this slot's end so findNextTimeSlot finds the NEXT one
    cursor = nextSlot.endTime;
  }

  return slots;
}
