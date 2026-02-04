/**
 * Backend Library Index
 *
 * Central exports for all backend utility functions.
 * Import from this file for cleaner imports.
 *
 * @example
 * import { findConflict, formatConflictMessage } from "./lib";
 * import { findNextTimeSlot, calculateDelay } from "./lib";
 */

export {
  // Core conflict detection
  findConflict,
  getOverlappingDays,
  windowsOverlap,
  findOverlappingWindows,

  // Formatting utilities
  formatTime,
  formatWindowRange,
  getDayName,
  getDayShortName,
  formatDays,
  formatConflictMessage,
  formatConflictMessageDetailed,

  // Types
  type TimeWindow,
  type TaskForConflictCheck,
  type ConflictResult,
  type ConflictDetails,
} from "./conflictDetection";

export {
  // Scheduling utilities
  findNextTimeSlot,
  calculateDelay,
  getStartOfDay,
  getSecondsFromMidnight,
  getDayOfWeek,
  timeWindowToTimestamp,
  formatTimeSlot,

  // Types
  type Recurrence,
  type NextTimeSlot,
  type TimeWindow as SchedulingTimeWindow,
} from "./scheduling";
