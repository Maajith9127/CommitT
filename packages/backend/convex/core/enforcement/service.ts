import { QueryCtx } from "../../_generated/server";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ENFORCEMENT SERVICE
 * ─────────────────────────────────────────────────────────────────────────────
 * Core business logic for verifying the "Lock-In" status of a user.
 * 
 * This service is the authoritative source for determining if an account-level
 * operation (Logout, Delete, Reset) is safe to perform.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface EnforcementConflict {
  title: string;
  startTime: number;
  endTime: number;
  status: string;
}

/**
 * Audit: checkSecurityStatusInternal
 * 
 * Scans for any active or upcoming commitments within a security threshold.
 * 
 * @param ctx The QueryCtx from Convex
 * @param userId The ID of the user to audit
 * @param thresholdMs The window (entry-gate) where logout is prohibited.
 */
export async function checkSecurityStatusInternal(
  ctx: QueryCtx,
  userId: string,
  thresholdMs: number = 6 * 60 * 60 * 1000 // 6hr default
) {
  const now = Date.now();
  const thresholdTime = now + thresholdMs;

  /**
   * Search Pattern:
   * We look for any instance that is either currently active (start < now < end)
   * or starting within our safety threshold (now < start < threshold).
   */
  const conflicts = await ctx.db
    .query("taskInstances")
    .withIndex("by_assignee_start", (q) => 
      q.eq("assignee_id", userId).lt("start", thresholdTime)
    )
    .filter((q) => q.gt(q.field("end"), now))
    .collect();

  const simplifiedConflicts: EnforcementConflict[] = conflicts.map(c => ({
    title: c.title,
    startTime: c.start,
    endTime: c.end,
    status: c.status
  }));

  return {
    safe: simplifiedConflicts.length === 0,
    conflicts: simplifiedConflicts,
    reason: simplifiedConflicts.length > 0 ? "Active or upcoming commitment detected" : undefined,
    serverTime: now
  };
}
