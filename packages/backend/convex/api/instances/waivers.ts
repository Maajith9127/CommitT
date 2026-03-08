import { v } from "convex/values";
import { authedMutation } from "../../middleware";
import { verifyWaiverChallenge } from "../../core/waivers/dispatcher";
import { Doc } from "../../_generated/dataModel";

/**
 * submitChallenge(): THE WAIVER STATE MACHINE BRIDGE
 * 
 * DESCRIPTION (PRODUCTION GRADE):
 * The central endpoint for the "Redemption Arc". Handles the atomic transition
 * from an active challenge to the next one, or to a full waiver.
 */
export const submitChallenge = authedMutation({
  args: {
    instanceId: v.id("taskInstances"),
    solution: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;

    // 1. DATA INTEGRITY CHECK
    const instance = await ctx.db.get(args.instanceId) as Doc<"taskInstances"> | null;
    if (!instance || instance.assignee_id !== user._id) {
       throw new Error("Unauthorized or instance not found.");
    }

    if (instance.status !== "waiver_active" || !instance.waiver_state) {
       throw new Error("No active waiver session found for this task.");
    }

    // 2. DISPATCH TO DOMAIN LOGIC (DECOUPLED)
    const result = await verifyWaiverChallenge(ctx, instance, args.solution);

    if (!result.success) {
      return { success: false, message: "Incorrect solution. Try again." };
    }

    // 3. ATOMIC STATE TRANSITION
    if (result.quotaReached) {
      // THE REDEMPTION ARC COMPLETES
      await ctx.db.patch(args.instanceId, {
        status: "waived",
        waiver_state: {
          ...instance.waiver_state,
          status: "completed",
          completed_at: Date.now(),
          challenges: result.challenges,
        }
      });

      // CANCEL THE FALLBACK PENALTY JOB (Prevention)
      if (instance.enforcement_job_id) {
        try {
          await ctx.scheduler.cancel(instance.enforcement_job_id);
        } catch (e) {
          console.log(`[submitChallenge] Penalty job already executed or fired.`);
        }
      }

      return { success: true, quotaReached: true, message: "All challenges solved! Penalty waived." };
    } else {
      // THE FLIP: Move to the next puzzle
      await ctx.db.patch(args.instanceId, {
        waiver_state: {
          ...instance.waiver_state,
          challenges: result.challenges,
        }
      });

      return { success: true, quotaReached: false, message: "Correct! Solving next..." };
    }
  },
});
