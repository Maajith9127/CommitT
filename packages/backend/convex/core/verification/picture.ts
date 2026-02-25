/**
 * PICTURE VALIDATOR
 *
 * Evidence expected: { url: string, timestamp?: number }
 * Validates that a photo URL was provided. In production, this should
 * also verify the image was uploaded to our storage (not a random URL)
 * and optionally run image analysis.
 */

import { Condition } from "../../types/domain/commitment";
import { ValidationResult } from "./evidenceValidators";

export function validatePicture(evidence: any, _condition: Condition): ValidationResult {
  if (typeof evidence?.url !== "string" || evidence.url.trim() === "") {
    return { passed: false, reason: "Invalid evidence: missing photo URL" };
  }

  // TODO: In production, verify the URL points to our own storage bucket
  // TODO: Optionally run image analysis (e.g., verify it's a gym photo)

  return { passed: true };
}
