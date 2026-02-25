import { Doc, Id } from "../../_generated/dataModel";

export type TaskId = Id<"tasks">;
export type TaskDoc = Doc<"tasks">;

export type RecurrenceType = "daily" | "weekly" | "monthly" | "once";

export interface TimeWindow {
  start: number; // seconds from midnight
  end: number;   // seconds from midnight
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
 * A single verification condition attached to a task or taskInstance.
 *
 * In the `tasks` table (blueprint), `id`, `status`, and `progress_percentage`
 * are absent — they only exist on the `taskInstances` copy where we track
 * per-condition verification state at runtime.
 */
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

