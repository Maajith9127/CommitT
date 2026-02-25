/**
 * TIME VALIDATOR
 *
 * Evidence expected: NONE — the server checks its own clock.
 * The client sends `{}` or `{ timestamp: number }` (we ignore the client timestamp).
 *
 * This is the most fundamental validator. It simply checks:
 * "Is the current server time within this task instance's [start, end] window?"
 *
 * If the user tries to verify outside the window, they fail.
 * A small grace period (5 minutes) is allowed after the window closes
 * to account for evidence-gathering delays (e.g., GPS lock took 30 seconds).
 */

import { Condition } from "../../types/domain/commitment";
import { ValidationResult } from "./evidenceValidators";

const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

export function validateTime(
  _evidence: any,
  _condition: Condition,
  context?: { instanceStart: number; instanceEnd: number },
): ValidationResult {
  if (!context) {
    return { passed: false, reason: "Server error: missing instance time context" };
  }

  const now = Date.now();

  if (now < context.instanceStart) {
    return { passed: false, reason: "Too early: task window hasn't started yet" };
  }

  if (now > context.instanceEnd + GRACE_PERIOD_MS) {
    return { passed: false, reason: "Too late: task window has already closed" };
  }

  return { passed: true };
}
