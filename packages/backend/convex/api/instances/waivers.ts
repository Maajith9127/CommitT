import { v } from "convex/values";
import { authedMutation } from "../../middleware";
import { armAccountabilityContract } from "../../execution/verification/runner";
import { Doc } from "../../_generated/dataModel";

/**
 * startSession(): Manual trigger to start a waiver/redemption session.
 * 
 * DESCRIPTION:
 * This allows a user to pre-emptively start their waiver period (e.g., CAPTCHA challenge)
 * before the task window officially ends. Once started, the "Accountability Bomb" 
 * is armed to fire based on the current time + configured deadline.
 * 
 * DESIGN RATIONALE:
 * 1. Provides user agency: "I can't make it, let me pay the price now."
 * 2. Deterministic Timing: The 60-minute (or X minute) timer starts the 
 *    moment this mutation is acknowledged.
 */
export const startSession = authedMutation({
  args: {
    instanceId: v.id("taskInstances"),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;

    // 1. Fetch & Ownership Validation
    const instance = await ctx.db.get(args.instanceId) as Doc<"taskInstances"> | null;
    if (!instance) {
      throw new Error("Task instance not found.");
    }

    if (instance.assignee_id !== user._id) {
      throw new Error("Unauthorized. You do not own this task instance.");
    }

    // 2. State Validation
    // A waiver session can only be started if the task is still 'In-Flight' (pending/proceeding).
    // If it's already waived, penalized, or proceeded, we reject.
    const isFinished = ["proceeded", "penalized", "waived"].includes(instance.status);
    if (isFinished) {
      throw new Error("Cannot start a waiver for a completed task.");
    }

    // 3. Prevent Double-Start
    // If a session is already active, we don't want to reset their timer.
    if (instance.status === "waiver_active") {
      return { success: true, message: "Waiver session is already active." };
    }

    // 4. Arm the Contract
    // We use Date.now() as the baseTime to start the timer IMMEDIATELY.
    await armAccountabilityContract(ctx, instance, Date.now(), "in_progress");

    return { 
      success: true, 
      message: "Accountability contract armed. Redemption window is now open." 
    };
  },
});
