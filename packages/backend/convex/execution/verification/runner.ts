import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { scheduleNextInstance } from "../scheduling/scheduler";

/**
 * runVerification(): The heartbeat of the system.
 * This function runs automatically at the end of every time slot.
 * Previously known as 'runScheduledCheck'.
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
        console.log(`[runVerification] Parent Task ${instance.task_id} deleted. stopping chain.`);
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
    // STEP 2: CONTINUE THE CHAIN
    // -------------------------------------------------------------------------
    // Schedule the NEXT instance.
    await scheduleNextInstance(ctx, task._id, instance.end, instance.recurrence);
  },
});
