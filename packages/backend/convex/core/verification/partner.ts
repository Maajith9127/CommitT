/**
 * PARTNER VALIDATOR
 *
 * Evidence expected: { confirmed: boolean, partner_id: string }
 * Validates that an accountability partner confirmed the activity.
 * In production, this should check a separate confirmation record
 * in the database rather than trusting a client boolean.
 */

import { Condition } from "../../types/domain/commitment";
import { ValidationResult } from "./evidenceValidators";

export function validatePartner(evidence: any, _condition: Condition): ValidationResult {
  if (typeof evidence?.partner_id !== "string" || !evidence.partner_id) {
    return { passed: false, reason: "Invalid evidence: missing partner confirmation" };
  }

  // TODO: Query DB for a matching confirmation record from the partner
  // rather than trusting the client's word

  return { passed: false, reason: "Partner confirmation not yet implemented" };
}
