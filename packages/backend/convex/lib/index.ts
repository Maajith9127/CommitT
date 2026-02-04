/**
 * Backend Library Index
 *
 * Central exports for all backend utility functions.
 * Import from this file for cleaner imports.
 *
 * @example
 * import { findConflict, formatSlotRange } from "./lib";
 */

export {
  // Core conflict detection
  findConflict,
  getOverlappingDays,
  slotsOverlap,
  extractTimeSlots,
  findOverlappingSlots,

  // Formatting utilities
  formatTime,
  formatSlotRange,
  getDayName,
  formatOverlappingDays,

  // Types
  type TimeSlot,
  type TaskForConflictCheck,
  type ConflictResult,
} from "./conflictDetection";
