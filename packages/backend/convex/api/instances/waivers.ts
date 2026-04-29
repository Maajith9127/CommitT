import { v } from "convex/values";
import { authedMutation } from "../../middleware";
import { verifyWaiverChallenge } from "../../core/waivers/dispatcher";
import { Doc } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import { armAccountabilityContract, evaluateGradingVerdict } from "../../execution/verification/runner";

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
          
          // ** AUDIT LOG: Record Waiver Completion (Penalty Prevented) **
          await ctx.scheduler.runAfter(0, internal.api.logs.mutations.createAuditLog, {
            userId: user._id,
            taskId: instance.task_id,
            instanceId: args.instanceId,
            event_type: "waiver_completed",
            message: `Event ${instance.title || args.instanceId} was waived off successfully.`,
            metadata: {
              timestamp: Date.now(),
              timestamp_readable: new Date().toISOString(),
            }
          });
          
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

/**
 * startSession(): Manual trigger to start a waiver/redemption session.
 * 
 * This endpoint allows users to pre-emptively start a redemption window 
 * (to solve challenges) while the habit window is still open, or after 
 * a failure but before the final penalty fires.
 * 
 * GUARD: Blocks activation for 'proceeded', 'waived', or 'penalized' states
 * to ensure that a successful or already-resolved habit cannot be 
 * retroactively "failed" or re-waived.
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
    if (isFinished) {
      return { success: false, message: "Cannot start a waiver for a completed task." };
    }

    // DEEP INTEGRITY GUARD: Sovereign Telemetry Check
    // Even if the root status is 'pending', we analyze the checkpoints to see if 
    // the user has already satisfied the habit's fulfillment criteria. This 
    // prevents "Waiver Sniping" on successful but un-finalized tasks.
    const isFailedTelemetry = evaluateGradingVerdict(instance);
    if (!isFailedTelemetry) {
      return { success: false, message: "Cannot start a waiver for a task already fulfilled via telemetry." };
    }

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
