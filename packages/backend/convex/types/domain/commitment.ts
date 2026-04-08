import { Doc, Id } from "../../_generated/dataModel";

export type TaskId = Id<"tasks">;
export type TaskDoc = Doc<"tasks">;

export type RecurrenceType = "daily" | "weekly" | "monthly" | "once";

export interface TimeWindow {
  start: number; // seconds from midnight
  end: number;   // seconds from midnight
  conditions?: Condition[];
  ruleId?: string;
  config?: any;
}

export interface Recurrence {
  type: string; // Matches runtime schema which might allow strings
  interval: number;
  time_windows: TimeWindow[];
  days_of_week?: number[];
  ends?: {
    type: string;
    count?: number;
    date?: number;
  };
}

export interface NextTimeSlot {
  startTime: number;
  endTime: number;
  dayOfWeek: number;
  timeWindow: TimeWindow;
}

/**
 * The possible verification states for a single condition within a taskInstance.
 * Mirrors `conditionStatusEnum` in convex/config/enums.ts.
 *
 * - "neutral"    → Not yet attempted (default for newly created instances)
 * - "verified"   → Evidence passed server-side validation
 * - "failed"     → Evidence rejected OR time window expired without attempt
 * - "applied"    → Condition was auto-applied (e.g. system-checked metrics)
 * - "waived"     → User completed a waiver task to bypass this condition
 * - "percentage" → Partial progress (use with progress_percentage)
 */
export type ConditionStatus =
  | "neutral"
  | "verified"
  | "failed"
  | "applied"
  | "waived"
  | "percentage";

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * STAY THROUGHOUT CHECKPOINT DEFINITION
 * ═════════════════════════════════════════════════════════════════════════════
 * A Checkpoint represents a single, randomly generated 5-minute ping window
 * mapped inside the root `checkpoints` array of a taskInstance. 
 *
 * It is completely detached from the overarching Task definition and exists 
 * solely to track the user's granular compliance over continuous periods.
 */
export interface Checkpoint {
  /** Strict beginning epoch of this specific 5-min ping window */
  start?: number;
  /** Strict literal end epoch of the 5-min ping window */
  end?: number;
  start_readable?: string;
  end_readable?: string;
  // Backwards compat
  scheduled_time?: number;
  window_end_time?: number;
  
  verification_status?: Record<string, "pending" | "verified" | "failed">;
  completed_at?: number;
  status?: "pending" | "verified" | "failed"; // For old instances
}

export interface Condition {
  /** Unique ID for this condition within the array (nanoid, set at creation) */
  id?: string;
  metric_key: string;
  component?: string;
  relation: string; // "eq" | "gt" | "within" | "outside" etc.
  target: {
    type: string;
    value: any;
  };
  /** Per-condition verification status (taskInstances only) */
  status?: ConditionStatus;
  /** 0–100 progress when status is "percentage" (taskInstances only) */
  progress_percentage?: number;
}
