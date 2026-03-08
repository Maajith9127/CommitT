import { v } from "convex/values";
import { authedMutation } from "../../middleware";
import { armAccountabilityContract } from "../../execution/verification/runner";
import { Doc } from "../../_generated/dataModel";

/**
 * startSession(): Manual trigger to start a waiver/redemption session.
 */
export const startSession = authedMutation({
  args: {
    instanceId: v.id("taskInstances"),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;

    const instance = await ctx.db.get(args.instanceId) as Doc<"taskInstances"> | null;
    if (!instance) throw new Error("Task instance not found.");
    if (instance.assignee_id !== user._id) throw new Error("Unauthorized.");

    const isFinished = ["proceeded", "penalized", "waived"].includes(instance.status);
    if (isFinished) throw new Error("Cannot start a waiver for a completed task.");

    if (instance.status === "waiver_active") {
      return { success: true, message: "Waiver session is already active." };
    }

    await armAccountabilityContract(ctx, instance, Date.now(), "in_progress");

    return { 
      success: true, 
      message: "Accountability contract armed. Redemption window is now open." 
    };
  },
});
