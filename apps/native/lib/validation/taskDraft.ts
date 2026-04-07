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

/**
 * PRODUCTION RATIONALE: "The Binding Metric Protocol"
 * These metrics are considered 'Binding Actions' — specific enforcers that 
 * anchor a time-based commitment. A commitment is valid ONLY if every 
 * active time window is covered by at least one Binding Action.
 */
const BINDING_METRICS = ["location", "digital_commitment", "partner", "picture", "video"] as const;

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
 * Checks if a specific set of conditions contains at least one 
 * valid Binding Action as defined in the protocol.
 */
export function hasBindingAction(conditions: Condition[]): boolean {
  return conditions.some((c) => (BINDING_METRICS as unknown as string[]).indexOf(c.metric_key) !== -1);
}

/**
 * Checks if any "Binding Action" is present at the Task level.
 * 
 * NOTE: This is kept for backwards compatibility and high-level checks, 
 * but `validateHierarchicalBinding` should be used for full schedule integrity.
 */
export function hasAnyXCondition(
  conditions: Condition[],
  assigneeId: string | null,
  assignerId: string | null
): boolean {
  // Check condition-based anchors (location, photo, app-block, etc.)
  const hasMetricBinding = hasBindingAction(conditions);

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
 * Validates the "Hierarchical Binding" rule.
 * 
 * PRODUCTION RATIONALE: "The Total Override Strategy"
 * To prevent unexpected overlapping rules, if a slot defines ANY of its own conditions,
 * it completely supersedes the global Root conditions for that window.
 * 
 * Every slot in the commitment schedule MUST be covered by a Binding Action, 
 * either inherited from the Root OR explicitly defined in a Slot Override.
 */
export function validateHierarchicalBinding(draft: TaskDraft): ValidationResult {
  const { recurrence, conditions: rootConditions, assignee_id, assigner_id } = draft;
  const { time_windows } = recurrence;

  // 1. PARTNER SAFETY NET: If the task is bound to a partner account,
  // the entire task is valid regardless of specific hardware enforcers.
  if (hasPartnerCondition(assignee_id, assigner_id)) {
    return { valid: true };
  }

  // 2. GLOBAL BINDING STATE: Pre-calculate if the Root level is "Armed"
  const isRootArmed = hasBindingAction(rootConditions);

  // 3. RECURSIVE SCAN: Ensure 100% coverage across all time windows
  for (let i = 0; i < time_windows.length; i++) {
    const slot = time_windows[i];
    const slotConditions = slot.conditions || [];

    // CASE A: The slot has specifically assigned conditions (Override Mode)
    if (slotConditions.length > 0) {
      if (!hasBindingAction(slotConditions)) {
        return {
          valid: false,
          error: `Time slot #${i + 1} has custom overrides but is missing a required Binding Action (Location or App Block).`,
          errorCode: "TIME_REQUIRES_X_CONDITION",
        };
      }
    } 
    // CASE B: The slot is empty (Inheritance Mode)
    else {
      // If the slot is empty, it MUST inherit an armed state from the Root
      if (!isRootArmed) {
        return {
          valid: false,
          error: `Time slot #${i + 1} has no enforcer. Add a Location/App Block to this slot, or set a Global rule.`,
          errorCode: "TIME_REQUIRES_X_CONDITION",
        };
      }
    }
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

  // Check 3: Hierarchical Binding (Time Slots + X-Conditions)
  // Ensures 100% schedule coverage while allowing granular overrides.
  const bindingCheck = validateHierarchicalBinding(draft);
  if (!bindingCheck.valid) {
    return bindingCheck;
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
