/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  Evidence Validators — Registry & Entry Point                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                            ║
 * ║  This file is the single entry point for all evidence validation.          ║
 * ║  Each metric_key has its own validator in `./validators/<key>.ts`.         ║
 * ║                                                                            ║
 * ║  ADDING A NEW METRIC:                                                      ║
 * ║  1. Create `./validators/<key>.ts` with a function matching EvidenceValidator║
 * ║  2. Import it below and add one line to VALIDATOR_REGISTRY                 ║
 * ║  3. The mutation automatically picks it up — zero changes elsewhere        ║
 * ║                                                                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { Condition } from "../../types/domain/commitment";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES (shared by all validator files)
// ─────────────────────────────────────────────────────────────────────────────

export type ValidationSuccess = { passed: true };
export type ValidationFailure = { passed: false; reason: string };
export type ValidationResult = ValidationSuccess | ValidationFailure;

/** The shape every validator function must follow */
export type EvidenceValidator = (
  evidence: any,
  condition: Condition,
  /** The instance's time window — used by time-aware validators */
  context?: { instanceStart: number; instanceEnd: number },
) => ValidationResult;

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTS — one per metric_key
// ─────────────────────────────────────────────────────────────────────────────

import { validateTime } from "./time";
import { validateLocation } from "./location";
import { validatePicture } from "./picture";
import { validateVideo } from "./video";
import { validatePartner } from "./partner";

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATOR REGISTRY
//
// Maps metric_key → validator function. To support a new metric, just add
// a new import above and one line here.
// ─────────────────────────────────────────────────────────────────────────────

export const VALIDATOR_REGISTRY: Record<string, EvidenceValidator> = {
  time: validateTime,
  location: validateLocation,
  picture: validatePicture,
  video: validateVideo,
  partner: validatePartner,
};

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up and execute the correct validator for a given metric_key.
 * Returns a failure if no validator is registered for the metric.
 */
export function validateEvidence(
  metricKey: string,
  evidence: any,
  condition: Condition,
  context?: { instanceStart: number; instanceEnd: number },
): ValidationResult {
  const validator = VALIDATOR_REGISTRY[metricKey];

  if (!validator) {
    return {
      passed: false,
      reason: `No validator registered for metric_key "${metricKey}"`,
    };
  }

  return validator(evidence, condition, context);
}
