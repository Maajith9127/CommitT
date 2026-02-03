/**
 * Time Slot Validation
 * 
 * Pure functions for validating time slots.
 * These are separated from UI for:
 * - Testability (can unit test without React)
 * - Reusability (can use in multiple places)
 * - Clarity (validation logic in one place)
 */

export type TimeSlot = {
  start: number; // seconds from midnight
  end: number;   // seconds from midnight
};

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

/**
 * Validates that start time is before end time.
 * 
 * @example
 * validateSlotOrder(32400, 36000) // 9AM to 10AM → { valid: true }
 * validateSlotOrder(36000, 32400) // 10AM to 9AM → { valid: false, error: "..." }
 */
export function validateSlotOrder(start: number, end: number): ValidationResult {
  if (start >= end) {
    return {
      valid: false,
      error: "End time must be after start time",
    };
  }
  return { valid: true };
}

/**
 * Checks if two time slots overlap.
 * 
 * Overlap happens when: slotA.start < slotB.end AND slotB.start < slotA.end
 * 
 * @example
 * // 9-10 AM and 9:30-10:30 AM → true (overlap)
 * // 9-10 AM and 11-12 PM → false (no overlap)
 */
export function slotsOverlap(slotA: TimeSlot, slotB: TimeSlot): boolean {
  return slotA.start < slotB.end && slotB.start < slotA.end;
}

/**
 * Validates that a new slot doesn't overlap with any existing slots.
 * 
 * @example
 * validateNoOverlap({ start: 32400, end: 36000 }, existingSlots)
 */
export function validateNoOverlap(
  newSlot: TimeSlot,
  existingSlots: TimeSlot[]
): ValidationResult {
  for (const existing of existingSlots) {
    if (slotsOverlap(newSlot, existing)) {
      return {
        valid: false,
        error: "This time slot overlaps with an existing one",
      };
    }
  }
  return { valid: true };
}

/**
 * Run all time slot validations.
 * Use this as the main entry point.
 * 
 * @example
 * const result = validateTimeSlot(32400, 36000, existingSlots);
 * if (!result.valid) {
 *   Alert.alert("Error", result.error);
 *   return;
 * }
 * // Proceed with saving...
 */
export function validateTimeSlot(
  start: number,
  end: number,
  existingSlots: TimeSlot[]
): ValidationResult {
  console.log("[Validation] validateTimeSlot called");
  console.log("[Validation] start:", start, "end:", end);
  console.log("[Validation] existingSlots:", existingSlots);

  // Check 1: Start must be before end
  const orderCheck = validateSlotOrder(start, end);
  console.log("[Validation] orderCheck result:", orderCheck);
  if (!orderCheck.valid) {
    return orderCheck;
  }

  // Check 2: No overlap with existing slots
  const overlapCheck = validateNoOverlap({ start, end }, existingSlots);
  console.log("[Validation] overlapCheck result:", overlapCheck);
  if (!overlapCheck.valid) {
    return overlapCheck;
  }

  console.log("[Validation] All checks passed!");
  return { valid: true };
}
