/**
 * LOCATION VALIDATOR
 *
 * Evidence expected: { lat: number, lng: number, accuracy?: number }
 * Condition target:  { lat, lng, radius } (from server DB)
 * Relation:          "within" | "outside"
 *
 * Checks whether the user's GPS coordinates are within (or outside) the
 * defined geofence radius. Also rejects evidence with suspiciously high
 * GPS accuracy values (likely faked or indoor drift).
 */

import { Condition } from "../../types/domain/commitment";
import { ValidationResult } from "./evidenceValidators";

// ─────────────────────────────────────────────────────────────────────────────
// MATH UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const EARTH_RADIUS_METERS = 6_371_000;
const MAX_ACCEPTABLE_ACCURACY_METERS = 100;

/**
 * Haversine formula — calculates the great-circle distance (in meters)
 * between two GPS coordinates.
 *
 * @see https://en.wikipedia.org/wiki/Haversine_formula
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATOR
// ─────────────────────────────────────────────────────────────────────────────

export function validateLocation(evidence: any, condition: Condition): ValidationResult {
  console.log("📍 [location validator] FRONTEND EVIDENCE RECEIVED:", evidence);

  // ── Guard: Evidence shape ──
  if (
    typeof evidence?.lat !== "number" ||
    typeof evidence?.lng !== "number"
  ) {
    return { passed: false, reason: "Invalid evidence: missing lat/lng coordinates" };
  }

  // ── Guard: Server rule shape ──
  const target = condition.target?.value;
  if (
    typeof target?.lat !== "number" ||
    typeof target?.lng !== "number" ||
    typeof target?.radius !== "number"
  ) {
    return { passed: false, reason: "Server condition misconfigured: missing target lat/lng/radius" };
  }

  // ── Guard: GPS accuracy (reject absurdly inaccurate readings) ──
  if (
    typeof evidence.accuracy === "number" &&
    evidence.accuracy > MAX_ACCEPTABLE_ACCURACY_METERS
  ) {
    return {
      passed: false,
      reason: `GPS accuracy too low (${evidence.accuracy}m). Must be under ${MAX_ACCEPTABLE_ACCURACY_METERS}m`,
    };
  }

  // ── Core check: Haversine distance ──
  const distance = haversineDistance(
    evidence.lat,
    evidence.lng,
    target.lat,
    target.lng,
  );

  const isWithinRadius = distance <= target.radius;

  if (condition.relation === "within") {
    return isWithinRadius
      ? { passed: true }
      : { passed: false, reason: `Too far: ${Math.round(distance)}m away (max ${target.radius}m)` };
  }

  if (condition.relation === "outside") {
    return !isWithinRadius
      ? { passed: true }
      : { passed: false, reason: `Too close: ${Math.round(distance)}m away (must be outside ${target.radius}m)` };
  }

  return { passed: false, reason: `Unknown location relation: "${condition.relation}"` };
}
