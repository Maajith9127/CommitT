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

/**
 * PRODUCTION RATIONALE: "The Binding Action Protocol"
 * A commitment is valid only if it has a 'Binding Action'. 
 * Binding Actions are split into:
 * 1. ACTIVE VERIFICATIONS: User must perform an action (GPS, Photo, etc.)
 * 2. PASSIVE ENFORCEMENTS: The System enforces a rule (App/Web Blocking).
 */
const ACTIVE_VERIFICATIONS = ["location", "partner", "picture", "video"] as const;
const PASSIVE_ENFORCEMENTS = ["digital_commitment"] as const;

/**
 * PRODUCTION RATIONALE: "The Binding Metric Protocol"
 * These metrics are considered 'Binding Actions' — specific enforcers that 
 * anchor a time-based commitment. A commitment is valid ONLY if every 
 * active time window is covered by at least one Binding Action.
 */
const BINDING_METRICS = ["location", "digital_commitment", "partner", "picture", "video"] as const;

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

/**
 * Checks if a specific set of conditions contains at least one 
 * valid Binding Action as defined in the protocol.
 */
export function hasBindingAction(conditions: Condition[]): boolean {
  return conditions.some((c) => (BINDING_METRICS as unknown as string[]).includes(c.metric_key));
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
export function validateHierarchicalBinding(
  globalConditions: Condition[],
  recurrence: Recurrence,
  assigneeId: string,
  assignerId: string
): ValidationResult {
  const { time_windows } = recurrence;

  // 1. PARTNER SAFETY NET: If the task is bound to a partner account,
  // the entire task is valid regardless of specific hardware enforcers.
  const hasPartner = Boolean(assigneeId && assigneeId !== assignerId);
  if (hasPartner) return { valid: true };

  // 2. GLOBAL BINDING STATE: Pre-calculate if the Root level is "Armed"
  const isRootArmed = hasBindingAction(globalConditions);

  // 3. RECURSIVE SCAN: Ensure 100% coverage across all time windows
  for (let i = 0; i < time_windows.length; i++) {
    const slot = time_windows[i];
    const slotConditions = slot.conditions || [];

    // CASE A: The slot has specifically assigned conditions (Override Mode)
    if (slotConditions.length > 0) {
      if (!hasBindingAction(slotConditions)) {
        return {
          valid: false,
          error: `Time slot #${i + 1} has a custom override but is missing a required Binding Action (Location or App Block).`,
          errorCode: "TIME_X_REQUIRED",
        };
      }
    } 
    // CASE B: The slot is empty (Inheritance Mode)
    else {
      // If the slot is empty, it MUST inherit an armed state from the Root
      if (!isRootArmed) {
        return {
          valid: false,
          error: `Time slot #${i + 1} has no enforcer (no local override and no global condition).`,
          errorCode: "TIME_X_REQUIRED",
        };
      }
    }
  }

  return { valid: true };
}

/** Legacy support (wrapper for new hierarchical check) */
export function validateTimeXRule(
  conditions: Condition[],
  assigneeId: string,
  assignerId: string
): ValidationResult {
  const hasPartner = Boolean(assigneeId && assigneeId !== assignerId);
  if (hasPartner) return { valid: true };
  
  if (!hasBindingAction(conditions)) {
    return {
      valid: false,
      error: "Commitment requires either a Verification (Location, Partner...) or an Enforcement (App Block).",
      errorCode: "TIME_X_REQUIRED",
    };
  }
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// PENALTY VALIDATION — Type-Specific Config Integrity Checks
// ─────────────────────────────────────────────────────────────────────────────
//
// Each penalty type has mandatory fields in its config object.
// The schema layer (lib/validators.ts) only checks structural shape.
// THIS function checks domain-level requirements:
//   • Does the embarrassing_photo penalty have a storageId?
//   • Does the email config have a valid recipient?
//   • Is the channel set?
//
// TO ADD A NEW PENALTY TYPE:
// 1. Add a new case to the switch below.
// 2. Validate the required config fields for that type.
// 3. Return a clear, user-friendly error message.
// ─────────────────────────────────────────────────────────────────────────────

const VALID_CHANNELS = ["whatsapp", "instagram", "email", "commit"] as const;

export function validatePenalty(penalty: { type: string; config: any } | null | undefined): ValidationResult {
  // No penalty = perfectly valid (not all commitments need penalties)
  if (!penalty) return { valid: true };

  const { type, config } = penalty;

  if (!config || typeof config !== "object") {
    return { valid: false, error: "Penalty configuration is missing", errorCode: "PENALTY_CONFIG_MISSING" };
  }

  switch (type) {
    case "embarrassing_photo": {
      // REQUIRED: A Convex storageId (uploaded photo reference)
      if (!config.storageId) {
        return {
          valid: false,
          error: "Penalty photo must be uploaded before creating the commitment",
          errorCode: "PENALTY_PHOTO_MISSING",
        };
      }

      // REQUIRED: A delivery channel (how the photo will be sent)
      if (!config.channel || !VALID_CHANNELS.includes(config.channel)) {
        return {
          valid: false,
          error: "Please select a valid delivery channel for the penalty photo",
          errorCode: "PENALTY_CHANNEL_INVALID",
        };
      }

      // REQUIRED: A description (the self-deprecation message)
      if (!config.description || typeof config.description !== "string" || config.description.trim().length === 0) {
        return {
          valid: false,
          error: "Please provide a description for the penalty",
          errorCode: "PENALTY_DESCRIPTION_MISSING",
        };
      }

      // CONDITIONAL: If email channel, validate email-specific fields
      if (config.channel === "email") {
        if (!config.emailTo || typeof config.emailTo !== "string" || !config.emailTo.includes("@")) {
          return {
            valid: false,
            error: "Please provide a valid recipient email address for the penalty",
            errorCode: "PENALTY_EMAIL_TO_INVALID",
          };
        }
        if (!config.emailSubject || typeof config.emailSubject !== "string" || config.emailSubject.trim().length === 0) {
          return {
            valid: false,
            error: "Please provide an email subject for the penalty",
            errorCode: "PENALTY_EMAIL_SUBJECT_MISSING",
          };
        }
      }

      return { valid: true };
    }

    case "send_email":
    case "send_money":
    case "commit_direct":
      // TODO: Add validation for other penalty types as they are implemented
      return { valid: true };

    default:
      return {
        valid: false,
        error: `Unknown penalty type: ${type}`,
        errorCode: "PENALTY_TYPE_UNKNOWN",
      };
  }
}

/** 
 * WAIVER VALIDATION 
 * Checks that the forgiveness challenge config makes sense.
 */
export function validateWaiver(waiver: { type: string; config: any; deadline_minutes: number } | null | undefined): ValidationResult {
  if (!waiver) return { valid: true };
  const { type, config, deadline_minutes } = waiver;
  
  // 1. Structural Checks
  if (deadline_minutes <= 0) {
    return { valid: false, error: "Waiver deadline must be greater than zero", errorCode: "WAIVER_DEADLINE_INVALID" };
  }

  if (!config || typeof config !== "object") {
    return { valid: false, error: "Waiver configuration is missing", errorCode: "WAIVER_CONFIG_MISSING" };
  }

  // 2. Type-Specific Config Checks
  switch (type) {
    case "captcha":
      if (!config.count || config.count <= 0) {
        return { valid: false, error: "Captcha count must be at least 1", errorCode: "WAIVER_CAPTCHA_COUNT_INVALID" };
      }
      return { valid: true };
    
    case "paragraph":
      return { valid: true };

    default:
       return { valid: false, error: `Unknown waiver type: ${type}`, errorCode: "WAIVER_TYPE_UNKNOWN" };
  }
}

export function validateCommitment(input: {
  title: string;
  recurrence: Recurrence;
  conditions: Condition[];
  assigner_id: string;
  assignee_id: string;
  penalty?: { type: string; config: any } | null;
  penalty_waiver?: { type: string; config: any; deadline_minutes: number } | null;
}): ValidationResult {
  const titleRes = validateTitle(input.title);
  if (!titleRes.valid) return titleRes;

  const recurRes = validateRecurrence(input.recurrence);
  if (!recurRes.valid) return recurRes;

  const bindingRes = validateHierarchicalBinding(input.conditions, input.recurrence, input.assignee_id, input.assigner_id);
  if (!bindingRes.valid) return bindingRes;

  // Validate Coupled Accountability: Both must be present OR both absent
  const hasPenalty = Boolean(input.penalty);
  const hasWaiver = Boolean(input.penalty_waiver);

  if (hasPenalty !== hasWaiver) {
    return {
      valid: false,
      error: "Either both penalty and waiver must be present, or both must be absent. Accountability is a two-way street!",
      errorCode: "PENALTY_WAIVER_MISMATCH",
    };
  }

  // Validate penalty config if provided (domain-level checks)
  const penaltyRes = validatePenalty(input.penalty);
  if (!penaltyRes.valid) return penaltyRes;

  // Validate waiver config if provided (domain-level checks)
  const waiverRes = validateWaiver(input.penalty_waiver);
  if (!waiverRes.valid) return waiverRes;

  return { valid: true };
}
