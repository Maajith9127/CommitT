import { v } from "convex/values";
import { recurrenceTypeEnum, recurrenceEndsTypeEnum, relationEnum, targetTypeEnum, verificationStyleEnum, intensityEnum, penaltyTypeEnum, waiverTypeEnum } from "../config/enums";

/**
 * Convex Schema Definitions (Structural Validation)
 * 
 * These schemas define the Expected Shape (Type System) of the data
 * at the API boundary and in the Database.
 * 
 * They ensure "Is this a number?" but not "Is this start time before end time?".
 * For complex business rules and logic checks, see `core/commitments/validator.ts`.
 */

/** Defines the success criteria (e.g., "Location must be Gym") */
export const ConditionsSchema = v.array(v.object({
  metric_key: v.string(),                  // What are we measuring?
  component: v.optional(v.string()),       // Specific component?
  relation: relationEnum,                  // "equals", "greater_than", etc.
  target: v.object({
    type: targetTypeEnum,                  // "number", "location", etc.
    value: v.any(),                        // The target value
  }),
}));

/** Defines the verification and alarm settings (the "rules" for the backend) */
export const ConfigSchema = v.object({
    verification_style: verificationStyleEnum,
    grace_period_minutes: v.optional(v.number()),
    alarms: v.object({
      lead_time_minutes: v.number(),
      interval_minutes: v.number(),
      sound_key: v.string(),
    }),
    stay_throughout_config: v.optional(v.object({
      intensity: intensityEnum,
      max_missed_checkins: v.number(),
    })),
  });

/** Defines how often a task repeats (e.g., "Every 2 days from 9am-5pm") */
export const RecurrenceSchema = v.object({
  type: recurrenceTypeEnum,                // "daily", "weekly", etc.
  interval: v.number(),                    // e.g. "Every 2 days"
  days_of_week: v.optional(v.array(v.number())), // 0-6 for Mon-Sun
  
  // Specific time slots when the task MUST be done
  time_windows: v.array(v.object({
    start: v.number(),                     // Seconds from midnight
    end: v.number(),                       // Seconds from midnight
    // Slot-specific overrides: If provided, these take precedence over global conditions
    conditions: v.optional(ConditionsSchema),
    ruleId: v.optional(v.string()),
    // Human-readable rule identifier (e.g., "Gym Logic") for UI display.
    // Captured at the boundary to simplify frontend rendering of existing slots.
    ruleName: v.optional(v.string()),
    config: v.optional(ConfigSchema),
  })),
  
  // When does the recurrence verify?
  ends: v.optional(v.object({
    type: recurrenceEndsTypeEnum,
    count: v.optional(v.number()),
    date: v.optional(v.number()),
  })),
});

// ─────────────────────────────────────────────────────────────────────────────
// PENALTY & WAIVER — Structural Validators for the Accountability Contract
// ─────────────────────────────────────────────────────────────────────────────
//
// Each penalty/waiver type has a DIFFERENT config shape:
//   • embarrassing_photo: { storageId, channel, description, emailTo, ... }
//   • send_money:         { amount, currency, ... }
//   • captcha:            { count, difficulty, ... }
//
// We use `v.any()` for config here because:
//   1. Convex doesn't support discriminated unions natively.
//   2. Type-specific validation happens in `core/commitments/validator.ts`.
//   3. Type-specific execution happens in `core/penalty/dispatcher.ts`.
//
// The `type` field acts as the discriminator that routes to the correct
// validator and executor at runtime.
// ─────────────────────────────────────────────────────────────────────────────

/** Defines the penalty consequence for failing a task */
export const PenaltySchema = v.union(
  v.object({
    type: penaltyTypeEnum,    // Discriminator: "embarrassing_photo", "send_money", etc.
    config: v.any(),          // Type-specific payload (validated by domain logic layer)
  }),
  v.null()
);

/** Defines the waiver challenge that can defuse a penalty */
export const PenaltyWaiverSchema = v.union(
  v.object({
    type: waiverTypeEnum,           // Discriminator: "captcha", "paragraph", etc.
    config: v.any(),                // Type-specific settings (validated by domain logic layer)
    deadline_minutes: v.number(),   // How long the user has to complete the waiver after failing
  }),
  v.null()
);
