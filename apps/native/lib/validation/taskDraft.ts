/**
 * Task Draft Validation
 *
 * Pure functions for validating task drafts before submission.
 * These are separated from UI for:
 * - Testability (can unit test without React)
 * - Reusability (can use in multiple places)
 * - Clarity (validation logic in one place)
 *
 * Validation Rules:
 * 1. Title is required
 * 2. Time condition alone is not valid - requires at least one "X" condition
 *    where X can be: location, partner, picture, or video
 */

import type { TaskDraft, Condition, Recurrence } from "@/stores/useTaskDraftStore";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string; errorCode: ValidationErrorCode };

/**
 * Error codes for programmatic handling of validation errors.
 * Useful for analytics, testing, and conditional UI logic.
 */
export type ValidationErrorCode =
  | "TITLE_REQUIRED"
  | "TIME_REQUIRED"
  | "TIME_REQUIRES_X_CONDITION"
  | "PENALTY_WAIVER_MISMATCH";

/**
 * PRODUCTION RATIONALE: "The Binding Action Protocol"
 * A commitment is valid only if it has a 'Binding Action'. 
 * Binding Actions are split into:
 * 1. ACTIVE VERIFICATIONS: User must perform an action (GPS, Photo, etc.)
 * 2. PASSIVE ENFORCEMENTS: The System enforces a rule (App/Web Blocking).
 * 
 * Either one is sufficient to anchor a Time-based commitment.
 */
const ACTIVE_VERIFICATIONS = [
  "location",   // GPS-based location verification
  "partner",    // Partner/accountability buddy
  "picture",    // Photo verification  
  "video",      // Video verification
] as const;

const PASSIVE_ENFORCEMENTS = [
  "digital_commitment", // System-enforced App/Website blocking
] as const;

const BINDING_METRICS = [...ACTIVE_VERIFICATIONS, ...PASSIVE_ENFORCEMENTS] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Individual Validators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that the task has a non-empty title.
 *
 * @example
 * validateTitle("") // { valid: false, error: "...", errorCode: "TITLE_REQUIRED" }
 * validateTitle("Morning Run") // { valid: true }
 */
export function validateTitle(title: string | undefined): ValidationResult {
  if (!title || title.trim() === "") {
    return {
      valid: false,
      error: "Please enter a name for your commitment",
      errorCode: "TITLE_REQUIRED",
    };
  }
  return { valid: true };
}

/**
 * Checks if conditions array contains a specific metric type.
 */
export function hasCondition(conditions: Condition[], metricKey: string): boolean {
  return conditions.some((c) => c.metric_key === metricKey);
}

/**
 * Checks if a partner (assignee) is set.
 * Partner condition is true when assignee_id is set and different from assigner_id.
 */
export function hasPartnerCondition(
  assigneeId: string | null,
  assignerId: string | null
): boolean {
  return Boolean(assigneeId && assigneeId !== assignerId);
}

/**
 * Checks if any "Binding Action" is present.
 * Binding actions include active verifications and passive enforcements.
 */
export function hasAnyXCondition(
  conditions: Condition[],
  assigneeId: string | null,
  assignerId: string | null
): boolean {
  // Check condition-based anchors (location, photo, app-block, etc.)
  const hasMetricBinding = BINDING_METRICS.some((metric) =>
    hasCondition(conditions, metric)
  );

  // Check partner (assignee-based)
  const hasPartner = hasPartnerCondition(assigneeId, assignerId);

  return hasMetricBinding || hasPartner;
}

/**
 * Validates that time_windows are present in recurrence.
 * Time is required for all commitments.
 *
 * @example
 * validateTimeRequired({ time_windows: [] }) // { valid: false, error: "...", errorCode: "TIME_REQUIRED" }
 * validateTimeRequired({ time_windows: [{ start: 0, end: 3600 }] }) // { valid: true }
 */
export function validateTimeRequired(recurrence: Recurrence): ValidationResult {
  const hasTime = recurrence.time_windows && recurrence.time_windows.length > 0;

  if (!hasTime) {
    return {
      valid: false,
      error: "Please set a time for your commitment",
      errorCode: "TIME_REQUIRED",
    };
  }

  return { valid: true };
}

/**
 * Validates the "Time + X" rule.
 * Time condition must be paired with at least one X condition.
 *
 * Note: This assumes time is already validated as present.
 * Call validateTimeRequired first.
 *
 * @example
 * // Only time → invalid
 * validateTimeXRule([{ metric_key: "time", ... }], null, null)
 * // → { valid: false, error: "...", errorCode: "TIME_REQUIRES_X_CONDITION" }
 *
 * // Time + location → valid
 * validateTimeXRule([{ metric_key: "time" }, { metric_key: "location" }], null, null)
 * // → { valid: true }
 */
export function validateTimeXRule(
  conditions: Condition[],
  assigneeId: string | null,
  assignerId: string | null
): ValidationResult {
  const hasX = hasAnyXCondition(conditions, assigneeId, assignerId);

  if (!hasX) {
    return {
      valid: false,
      error: "Commitment requires either a Verification (Location, Partner...) or an Enforcement (App Blocking).",
      errorCode: "TIME_REQUIRES_X_CONDITION",
    };
  }

  return { valid: true };
}

/**
 * Validates the Penalty-Waiver coupling.
 * If a penalty is set, a waiver must be set, and vice-versa.
 */
export function validatePenaltyWaiverCoupling(draft: TaskDraft): ValidationResult {
  const hasPenalty = Boolean(draft.penalty);
  const hasWaiver = Boolean(draft.penalty_waiver);

  if (hasPenalty !== hasWaiver) {
    return {
      valid: false,
      error: hasPenalty 
        ? "Penalty requires a Waiver. Please choose how you want to earn it." 
        : "Waiver requires a Penalty. Please choose a consequence.",
      errorCode: "PENALTY_WAIVER_MISMATCH",
    };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Validator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run all task draft validations.
 * Use this as the main entry point for pre-submission validation.
 *
 * @param draft - The task draft from Zustand store
 * @returns ValidationResult with error details if invalid
 *
 * @example
 * const result = validateTaskDraft(draft);
 * if (!result.valid) {
 *   showErrorModal(result.error);
 *   return;
 * }
 * // Proceed with submission...
 */
export function validateTaskDraft(draft: TaskDraft): ValidationResult {
  // Check 1: Title is required
  const titleCheck = validateTitle(draft.title);
  if (!titleCheck.valid) {
    return titleCheck;
  }

  // Check 2: Time is required (from recurrence.time_windows)
  const timeCheck = validateTimeRequired(draft.recurrence);
  if (!timeCheck.valid) {
    return timeCheck;
  }

  // Check 3: Time + X rule (time must be paired with at least one X condition)
  const timeXCheck = validateTimeXRule(
    draft.conditions,
    draft.assignee_id,
    draft.assigner_id
  );
  if (!timeXCheck.valid) {
    return timeXCheck;
  }

  // Check 4: Penalty-Waiver Coupling
  const couplingCheck = validatePenaltyWaiverCoupling(draft);
  if (!couplingCheck.valid) {
    return couplingCheck;
  }

  // All checks passed
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions (for UI/debugging)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a summary of which conditions are currently set.
 * Useful for debugging and UI display.
 */
export function getConditionSummary(
  draft: TaskDraft
): {
  hasTime: boolean;
  hasLocation: boolean;
  hasPartner: boolean;
  hasPicture: boolean;
  hasVideo: boolean;
  hasAnyX: boolean;
} {
  return {
    hasTime: draft.recurrence.time_windows?.length > 0,
    hasLocation: hasCondition(draft.conditions, "location"),
    hasPartner: hasPartnerCondition(draft.assignee_id, draft.assigner_id),
    hasPicture: hasCondition(draft.conditions, "picture"),
    hasVideo: hasCondition(draft.conditions, "video"),
    hasAnyX: hasAnyXCondition(draft.conditions, draft.assignee_id, draft.assigner_id),
  };
}
