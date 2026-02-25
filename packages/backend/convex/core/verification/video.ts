/**
 * VIDEO VALIDATOR
 *
 * Evidence expected: { url: string, duration?: number }
 * Similar to picture but for video evidence.
 */

import { Condition } from "../../types/domain/commitment";
import { ValidationResult } from "./evidenceValidators";

export function validateVideo(evidence: any, _condition: Condition): ValidationResult {
  if (typeof evidence?.url !== "string" || evidence.url.trim() === "") {
    return { passed: false, reason: "Invalid evidence: missing video URL" };
  }

  // TODO: Verify video duration meets minimum requirement if specified
  // TODO: Verify URL points to our storage

  return { passed: true };
}
