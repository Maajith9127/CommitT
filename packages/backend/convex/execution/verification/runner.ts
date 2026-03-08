import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { syncTaskSchedule } from "../scheduling/scheduler";

/**
 * runVerification(): The heartbeat of the system.
 * This function runs automatically at the end of every time slot.
 * 
 * Instead of recalculating the next slot, it follows the linked-list chain
 * via next_instance_id to find and schedule the next instance.
 */
export const runVerification = internalMutation({
  args: { 
    instanceId: v.id("taskInstances"),
    taskTitle: v.optional(v.string()) // Metadata for debugging/logs
  },
  handler: async (ctx, args) => {
    // 1. Fetch the Instance
    const instance = await ctx.db.get(args.instanceId);
    if (!instance) {
      console.log(`[runVerification] Instance ${args.instanceId} not found. Chain broken.`);
      return;
    }

    // 2. Fetch the Parent Task (for context)
    const task = await ctx.db.get(instance.task_id);
    if (!task) {
        console.log(`[runVerification] Parent Task ${instance.task_id} deleted. Stopping chain.`);
        return;
    }

    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`[runVerification] VERIFYING: ${instance.title}`);
    console.log(`[runVerification] Time     : ${new Date().toISOString()}`);
    console.log("═══════════════════════════════════════════════════════════════");

    // -------------------------------------------------------------------------
    // [PHASE 1] VERIFICATION & GRADING
    // -------------------------------------------------------------------------
    // TODO: Integration points for GPS/Photo verification strategies.
    // Logic: If 'pending' at window end, it's an automatic failure.
    const isFailed = instance.status === "pending"; 

    if (isFailed) {
      console.log(`[runVerification] Failure detected for instance ${args.instanceId}.`);

      // ── ACCOUNTABILITY CONTRACT CHECK ──
      // If a penalty/waiver exists, we initiate the Redemption Arc.
      if (instance.penalty && instance.penalty_waiver) {
        const deadlineMs = instance.penalty_waiver.deadline_minutes * 60 * 1000;
        
        //  PROD-LEVEL DETERMINISTIC TIMING
        // We calculate the deadline based on when the task ACTUALLY ended,
        // not when this code runs. This ensures zero "bonus time" due to server lag.
        const expiresAt = instance.end + deadlineMs;

        // 1. ARM THE GATEKEEPER (The Penalty "Bomb")
        // We schedule the enforcement worker to fire after the waiver deadline.
        // We pass both IDs for the "Silent Abort" safety guards.
        const enforcementJobId = await ctx.scheduler.runAt(
          expiresAt,
          internal.execution.penalties.worker.firePenalty,
          { 
            taskId: instance.task_id,
            instanceId: instance._id 
          }
        );

        // 2. OPEN THE WAIVER WINDOW
        // Update status to 'waiver_active' so the UI can show the redemption challenge.
        await ctx.db.patch(args.instanceId, {
          status: "waiver_active",
          enforcement_job_id: enforcementJobId,
          waiver_state: {
            status: "offered",
            opened_at: Date.now(),
            expires_at: expiresAt,
          }
        });

        console.log(`[runVerification] Penalty armed. Waiver expires at ${new Date(expiresAt).toISOString()}`);
      } else {
        // No contract exists. Hard failure.
        await ctx.db.patch(args.instanceId, { status: "failed" });
      }
    } else {
      // Logic: If status was already set to 'proceeding' and verification passed.
      await ctx.db.patch(args.instanceId, { status: "proceeded" });
      console.log(`[runVerification] Success! Status set to 'proceeded'.`);
    }

    // -------------------------------------------------------------------------
    // [PHASE 2] THE HEARTBEAT (SELF-HEALING)
    // -------------------------------------------------------------------------
    // CRITICAL PROD PATTERN: We trigger the next instance scheduling IMMEDIATELY.
    // A pending penalty must never stop the user's progress for future occurrences.
    // syncTaskSchedule is idempotent and will clean up any clashing jobs.
    await syncTaskSchedule(ctx, instance.task_id);
    
    console.log(`[runVerification] Heartbeat sync complete for task ${instance.task_id}.`);
  },
});

