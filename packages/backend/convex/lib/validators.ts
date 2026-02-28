import { v } from "convex/values";
import { recurrenceTypeEnum, recurrenceEndsTypeEnum, relationEnum, targetTypeEnum, verificationStyleEnum, intensityEnum } from "../config/enums";

/**
 * Convex Schema Definitions (Structural Validation)
 * 
 * These schemas define the Expected Shape (Type System) of the data
 * at the API boundary and in the Database.
 * 
 * They ensure "Is this a number?" but not "Is this start time before end time?".
 * For complex business rules and logic checks, see `core/commitments/validator.ts`.
 */

/** Defines how often a task repeats (e.g., "Every 2 days from 9am-5pm") */
export const RecurrenceSchema = v.object({
  type: recurrenceTypeEnum,                // "daily", "weekly", etc.
  interval: v.number(),                    // e.g. "Every 2 days"
  days_of_week: v.optional(v.array(v.number())), // 0-6 for Mon-Sun
  
  // Specific time slots when the task MUST be done
  time_windows: v.array(v.object({
    start: v.number(),                     // Seconds from midnight
    end: v.number(),                       // Seconds from midnight
  })),
  
  // When does the recurrence verify?
  ends: v.optional(v.object({
    type: recurrenceEndsTypeEnum,
    count: v.optional(v.number()),
    date: v.optional(v.number()),
  })),
});

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
