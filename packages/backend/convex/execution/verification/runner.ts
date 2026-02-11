import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";

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
    // STEP 1: VERIFY & GRADE
    // -------------------------------------------------------------------------
    // TODO: Implement specific strategies (GPS, Photo) here.
    // For now, we assume success if it ran.
    
    // Update status to PROCEEDED (or FAILED based on checks)
    await ctx.db.patch(args.instanceId, { 
      status: "proceeded" 
    });

    // -------------------------------------------------------------------------
    // STEP 2: CONTINUE THE CHAIN via linked list
    // -------------------------------------------------------------------------
    if (instance.next_instance_id) {
      const nextInstance = await ctx.db.get(instance.next_instance_id);
      if (nextInstance) {
        console.log(`[runVerification] Chaining to next instance: ${nextInstance._id} at ${new Date(nextInstance.end).toISOString()}`);
        
        const jobId = await ctx.scheduler.runAt(
          nextInstance.end,
          internal.execution.verification.runner.runVerification,
          { instanceId: nextInstance._id, taskTitle: nextInstance.title },
        );
        await ctx.db.patch(nextInstance._id, { scheduled_job_id: jobId });
      } else {
        console.log(`[runVerification] Next instance ${instance.next_instance_id} not found. Chain ends.`);
      }
    } else {
      console.log(`[runVerification] No next_instance_id. Chain complete for task ${instance.task_id}.`);
    }
  },
});

