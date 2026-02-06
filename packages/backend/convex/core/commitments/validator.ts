/**
 * Commitment Validators (Domain Logic)
 *
 * Pure classification of commitment validity.
 *
 * @module core/commitments/validator
 */

import { Recurrence, Condition } from "../../types/domain/commitment";

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string; errorCode: string };

const MAX_TITLE_LENGTH = 100;
const X_CONDITION_METRICS = ["location", "partner", "picture", "video"] as const;

export function validateTitle(title: string | undefined): ValidationResult {
  const trimmed = title?.trim() ?? "";
  if (trimmed === "") {
    return { valid: false, error: "Commitment name is required", errorCode: "TITLE_REQUIRED" };
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    return { valid: false, error: `Commitment name must be ${MAX_TITLE_LENGTH} chars or less`, errorCode: "TITLE_TOO_LONG" };
  }
  return { valid: true };
}

export function validateRecurrence(recurrence: Recurrence): ValidationResult {
  if (!recurrence.days_of_week || recurrence.days_of_week.length === 0) {
    return { valid: false, error: "Please select at least one day", errorCode: "DAYS_REQUIRED" };
  }
  if (!recurrence.time_windows || recurrence.time_windows.length === 0) {
    return { valid: false, error: "Please add at least one time slot", errorCode: "TIME_SLOTS_REQUIRED" };
  }
  // Order check
  for (const slot of recurrence.time_windows) {
    if (slot.start >= slot.end) {
      return { valid: false, error: "End time must be after start time", errorCode: "INVALID_TIME_SLOT" };
    }
  }
  // Overlap check
  for (let i = 0; i < recurrence.time_windows.length; i++) {
    for (let j = i + 1; j < recurrence.time_windows.length; j++) {
      const a = recurrence.time_windows[i];
      const b = recurrence.time_windows[j];
      if (a.start < b.end && b.start < a.end) {
        return { valid: false, error: "Time slots overlap", errorCode: "TIME_SLOTS_OVERLAP" };
      }
    }
  }
  return { valid: true };
}

export function validateTimeXRule(
  conditions: Condition[],
  assigneeId: string,
  assignerId: string
): ValidationResult {
  const hasMetricX = conditions.some((c) => X_CONDITION_METRICS.includes(c.metric_key as any));
  const hasPartner = Boolean(assigneeId && assigneeId !== assignerId);

  if (!hasMetricX && !hasPartner) {
    return {
      valid: false,
      error: "Time + X combination required (Location, Partner, Picture, or Video)",
      errorCode: "TIME_X_REQUIRED",
    };
  }
  return { valid: true };
}

export function validateCommitment(input: {
  title: string;
  recurrence: Recurrence;
  conditions: Condition[];
  assigner_id: string;
  assignee_id: string;
}): ValidationResult {
  const titleRes = validateTitle(input.title);
  if (!titleRes.valid) return titleRes;

  const recurRes = validateRecurrence(input.recurrence);
  if (!recurRes.valid) return recurRes;

  const xRes = validateTimeXRule(input.conditions, input.assignee_id, input.assigner_id);
  if (!xRes.valid) return xRes;

  return { valid: true };
}
