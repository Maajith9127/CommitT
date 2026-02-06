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

export interface Condition {
  metric_key: string;
  component?: string;
  relation: string; // "eq" | "gt" etc.
  target: {
    type: string;
    value: any;
  };
}

