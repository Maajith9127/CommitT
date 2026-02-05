/**
 * Task Input Validation
 *
 * Backend validation for task creation/update.
 * These rules MUST mirror the frontend validation for consistency,
 * but are the SOURCE OF TRUTH for security.
 *
 * NEVER trust frontend validation alone - always validate on backend.
 *
 * Validation Rules:
 * 1. Title is required (non-empty after trimming)
 * 2. At least one day must be selected (for recurring tasks)
 * 3. At least one time slot must exist
 * 4. No time slot can have start >= end
 * 5. No time slots can overlap
 * 6. Time + X combination required (location, partner, picture, or video)
 *
 * @module lib/validation
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Time window in seconds from midnight */
export type TimeWindow = {
  start: number;
  end: number;
};

/** Recurrence configuration (matches Convex schema) */
export type RecurrenceInput = {
  type: string;
  interval: number;
  days_of_week?: number[];
  time_windows: TimeWindow[];
  ends?: {
    type: string;
    count?: number;
    date?: number;
  };
};

/** Condition from the task */
export type ConditionInput = {
  metric_key: string;
  component?: string;
  relation: string;
  target: {
    type: string;
    value: unknown;
  };
};

/** Full task input for validation */
export type TaskInput = {
  assigner_id: string;
  assignee_id: string;
  title: string;
  description: string;
  visibility: string;
  recurrence: RecurrenceInput;
  conditions: ConditionInput[];
};

/** Validation result with discriminated union */
export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string; errorCode: ValidationErrorCode };

/** Error codes for programmatic handling */
export type ValidationErrorCode =
  | "TITLE_REQUIRED"
  | "TITLE_TOO_LONG"
  | "DAYS_REQUIRED"
  | "TIME_SLOTS_REQUIRED"
  | "INVALID_TIME_SLOT"
  | "TIME_SLOTS_OVERLAP"
  | "TIME_X_REQUIRED"
  | "INVALID_ASSIGNER"
  | "INVALID_ASSIGNEE";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

/** Condition metric keys that qualify as "X" in the "Time + X" rule */
const X_CONDITION_METRICS = ["location", "partner", "picture", "video"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Individual Validators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that the title is non-empty and within length limits.
 */
export function validateTitle(title: string | undefined): ValidationResult {
  const trimmed = title?.trim() ?? "";

  if (trimmed === "") {
    return {
      valid: false,
      error: "Commitment name is required",
      errorCode: "TITLE_REQUIRED",
    };
  }

  if (trimmed.length > MAX_TITLE_LENGTH) {
    return {
      valid: false,
      error: `Commitment name must be ${MAX_TITLE_LENGTH} characters or less`,
      errorCode: "TITLE_TOO_LONG",
    };
  }

  return { valid: true };
}

/**
 * Validates that at least one day is selected.
 * For recurring tasks, days_of_week must have at least one entry.
 */
export function validateDaysRequired(recurrence: RecurrenceInput): ValidationResult {
  const hasDays = recurrence.days_of_week && recurrence.days_of_week.length > 0;

  if (!hasDays) {
    return {
      valid: false,
      error: "Please select at least one day",
      errorCode: "DAYS_REQUIRED",
    };
  }

  return { valid: true };
}

/**
 * Validates that at least one time slot exists.
 */
export function validateTimeSlotsRequired(recurrence: RecurrenceInput): ValidationResult {
  const hasSlots = recurrence.time_windows && recurrence.time_windows.length > 0;

  if (!hasSlots) {
    return {
      valid: false,
      error: "Please add at least one time slot",
      errorCode: "TIME_SLOTS_REQUIRED",
    };
  }

  return { valid: true };
}

/**
 * Validates that each time slot has start < end.
 */
export function validateTimeSlotOrder(timeWindows: TimeWindow[]): ValidationResult {
  for (let i = 0; i < timeWindows.length; i++) {
    const slot = timeWindows[i];
    if (slot.start >= slot.end) {
      return {
        valid: false,
        error: `Time slot ${i + 1}: End time must be after start time`,
        errorCode: "INVALID_TIME_SLOT",
      };
    }
  }

  return { valid: true };
}

/**
 * Checks if two time slots overlap.
 */
function slotsOverlap(slotA: TimeWindow, slotB: TimeWindow): boolean {
  return slotA.start < slotB.end && slotB.start < slotA.end;
}

/**
 * Validates that no time slots overlap with each other.
 */
export function validateNoOverlap(timeWindows: TimeWindow[]): ValidationResult {
  for (let i = 0; i < timeWindows.length; i++) {
    for (let j = i + 1; j < timeWindows.length; j++) {
      if (slotsOverlap(timeWindows[i], timeWindows[j])) {
        return {
          valid: false,
          error: `Time slots ${i + 1} and ${j + 1} overlap`,
          errorCode: "TIME_SLOTS_OVERLAP",
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Checks if conditions array contains a specific metric type.
 */
function hasCondition(conditions: ConditionInput[], metricKey: string): boolean {
  return conditions.some((c) => c.metric_key === metricKey);
}

/**
 * Checks if a partner is set (assignee different from assigner).
 */
function hasPartnerCondition(assigneeId: string, assignerId: string): boolean {
  return Boolean(assigneeId && assigneeId !== assignerId);
}

/**
 * Validates the "Time + X" rule.
 * Time must be paired with at least one of: location, partner, picture, video.
 */
export function validateTimeXRule(
  conditions: ConditionInput[],
  assigneeId: string,
  assignerId: string
): ValidationResult {
  // Check condition-based X (location, picture, video)
  const hasMetricX = X_CONDITION_METRICS.some((metric) =>
    hasCondition(conditions, metric)
  );

  // Check partner (assignee-based)
  const hasPartner = hasPartnerCondition(assigneeId, assignerId);

  if (!hasMetricX && !hasPartner) {
    return {
      valid: false,
      error: "Time + X combination required. Please add Location, Partner, Picture, or Video.",
      errorCode: "TIME_X_REQUIRED",
    };
  }

  return { valid: true };
}

/**
 * Validates that assigner_id is present.
 */
export function validateAssigner(assignerId: string | null | undefined): ValidationResult {
  if (!assignerId || assignerId.trim() === "") {
    return {
      valid: false,
      error: "Assigner ID is required",
      errorCode: "INVALID_ASSIGNER",
    };
  }

  return { valid: true };
}

/**
 * Validates that assignee_id is present.
 */
export function validateAssignee(assigneeId: string | null | undefined): ValidationResult {
  if (!assigneeId || assigneeId.trim() === "") {
    return {
      valid: false,
      error: "Assignee ID is required",
      errorCode: "INVALID_ASSIGNEE",
    };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Validator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run all task input validations.
 * Use this as the main entry point for backend validation before DB insert.
 *
 * @param input - The task input from the mutation args
 * @returns ValidationResult with error details if invalid
 *
 * @example
 * const validation = validateTaskInput(args);
 * if (!validation.valid) {
 *   return { success: false, error: { code: validation.errorCode, message: validation.error } };
 * }
 * // Proceed with insert...
 */
export function validateTaskInput(input: TaskInput): ValidationResult {
  // 1. Assigner ID is required
  const assignerCheck = validateAssigner(input.assigner_id);
  if (!assignerCheck.valid) return assignerCheck;

  // 2. Assignee ID is required
  const assigneeCheck = validateAssignee(input.assignee_id);
  if (!assigneeCheck.valid) return assigneeCheck;

  // 3. Title is required and within limits
  const titleCheck = validateTitle(input.title);
  if (!titleCheck.valid) return titleCheck;

  // 4. At least one day must be selected
  const daysCheck = validateDaysRequired(input.recurrence);
  if (!daysCheck.valid) return daysCheck;

  // 5. At least one time slot must exist
  const slotsCheck = validateTimeSlotsRequired(input.recurrence);
  if (!slotsCheck.valid) return slotsCheck;

  // 6. Each time slot must have start < end
  const orderCheck = validateTimeSlotOrder(input.recurrence.time_windows);
  if (!orderCheck.valid) return orderCheck;

  // 7. No time slots can overlap
  const overlapCheck = validateNoOverlap(input.recurrence.time_windows);
  if (!overlapCheck.valid) return overlapCheck;

  // 8. Time + X rule
  const timeXCheck = validateTimeXRule(
    input.conditions,
    input.assignee_id,
    input.assigner_id
  );
  if (!timeXCheck.valid) return timeXCheck;

  // All checks passed
  return { valid: true };
}

/**
 * Validate partial task updates.
 * Only validates fields that are being updated.
 *
 * @param updates - The partial update fields
 * @param existingTask - The existing task data (for context like assignee_id)
 * @returns ValidationResult
 */
export function validateTaskUpdate(
  updates: Partial<TaskInput>,
  existingTask: TaskInput
): ValidationResult {
  // Merge updates with existing for validation context
  const merged = { ...existingTask, ...updates };

  // Title check (if being updated)
  if (updates.title !== undefined) {
    const titleCheck = validateTitle(updates.title);
    if (!titleCheck.valid) return titleCheck;
  }

  // Recurrence checks (if being updated)
  if (updates.recurrence !== undefined) {
    const daysCheck = validateDaysRequired(updates.recurrence);
    if (!daysCheck.valid) return daysCheck;

    const slotsCheck = validateTimeSlotsRequired(updates.recurrence);
    if (!slotsCheck.valid) return slotsCheck;

    const orderCheck = validateTimeSlotOrder(updates.recurrence.time_windows);
    if (!orderCheck.valid) return orderCheck;

    const overlapCheck = validateNoOverlap(updates.recurrence.time_windows);
    if (!overlapCheck.valid) return overlapCheck;
  }

  // Time + X rule (check with merged data)
  if (updates.conditions !== undefined || updates.recurrence !== undefined) {
    const timeXCheck = validateTimeXRule(
      merged.conditions,
      merged.assignee_id,
      merged.assigner_id
    );
    if (!timeXCheck.valid) return timeXCheck;
  }

  return { valid: true };
}
