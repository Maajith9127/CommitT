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
    // STEP 1: VERIFY & GRADE
    // -------------------------------------------------------------------------
    // TODO: Implement specific strategies (GPS, Photo) here.
    // For now, we assume success if it ran.
    
    // Update status to PROCEEDED (or FAILED based on checks)
    await ctx.db.patch(args.instanceId, { 
      status: "proceeded" 
    });

    // -------------------------------------------------------------------------
    // STEP 2: RE-SYNC THE HEARTBEAT
    // -------------------------------------------------------------------------
    // Instead of manually chaining, we tell the Brain to find the NEXT 
    // pending temporal slot in the database and schedule it. 
    // This allows for dynamic edits to take effect immediately.
    await syncTaskSchedule(ctx, instance.task_id);
    
    console.log(`[runVerification] Heartbeat sync complete for task ${instance.task_id}.`);
  },
});

