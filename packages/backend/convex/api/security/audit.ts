import { v } from "convex/values";
import { authedQuery } from "../../middleware";
import { checkSecurityStatusInternal } from "../../core/enforcement/service";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SECURITY AUDIT API
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized security checks to prevent users from bypassing commitments
 * through account lifecycle events or data resets.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const checkLogoutSafety = authedQuery({
  args: {
    thresholdMs: v.optional(v.number()), // Defaults to 6 hours
  },
  handler: async (ctx, args) => {
    // Standardized Delegation Pattern:
    // API logic validates auth and args, then delegates to Core Services.
    return await checkSecurityStatusInternal(ctx, ctx.user._id, args.thresholdMs);
  },
});
