import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { authedMutation } from "../../middleware";
import { authComponent } from "../../middleware/auth";
import { syncHardwareBondInternal, releaseHardwareBondInternal } from "../../core/enforcement/bondService";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HARDWARE BOND API
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides public endpoints for the "Marriage Protocol."
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * ** SYNC HARDWARE BOND **
 * The primary security handshake for the login flow.
 * Uses a standard mutation to gracefully handle session propagation delays 
 * without throwing scary Convex Server Errors in the console.
 */
export const syncHardwareBond = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    // 1. Graceful Auth Check (allows frontend to retry silently)
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return { success: false, retry: true, reason: "Session syncing" };
    }

    // 2. Perform the Marriage Check
    return await syncHardwareBondInternal(ctx, user._id, args.deviceId);
  },
});

/**
 * ** RELEASE HARDWARE BOND **
 * Public endpoint for "Divorce." Only allowed if commitments are zero.
 */
export const releaseHardwareBond = authedMutation({
  args: {},
  handler: async (ctx) => {
    return await releaseHardwareBondInternal(ctx, ctx.user._id);
  },
});
