/**
 * Validation Module Index
 *
 * Central export for all validation utilities.
 * Import from this file for cleaner imports:
 *
 * @example
 * import { validateTaskDraft, validateTimeSlot } from "@/lib/validation";
 */

// Time slot validation (for time picker)
export {
  validateTimeSlot,
  validateSlotOrder,
  validateNoOverlap,
  slotsOverlap,
  type TimeSlot,
  type ValidationResult as TimeSlotValidationResult,
} from "./timeSlot";

// Task draft validation (for pre-submission)
export {
  validateTaskDraft,
  validateTitle,
  validateTimeRequired,
  validateTimeXRule,
  hasCondition,
  hasPartnerCondition,
  hasAnyXCondition,
  getConditionSummary,
  type ValidationResult as TaskDraftValidationResult,
  type ValidationErrorCode,
} from "./taskDraft";
