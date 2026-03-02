import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { syncTaskSchedule } from "./scheduling/scheduler";

/**
 * watchdogSync: The "Self-Healing" heart of the system.
 * 
 * It scans all active tasks and identifies any that are "orphaned"
 * (i.e. have future pending instances but NO scheduled job).
 */
export const watchdogSync = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allTasks = await ctx.db.query("tasks").collect();
    
    let healedCount = 0;

    for (const task of allTasks) {
      // Find the next pending instance
      const nextPending = await ctx.db
        .query("taskInstances")
        .withIndex("by_task", (q) => q.eq("task_id", task._id))
        .filter((q) => q.and(
          q.eq(q.field("status"), "pending"),
          q.gt(q.field("end"), Date.now())
        ))
        .first();

      // If we have a pending instance but no job is linked, sync it!
      if (nextPending && !nextPending.scheduled_job_id) {
        console.log(`[Watchdog] Healing orphaned task: ${task.title} (ID: ${task._id})`);
        await syncTaskSchedule(ctx, task._id);
        healedCount++;
      }
    }

    return { status: "success", tasksChecked: allTasks.length, tasksHealed: healedCount };
  },
});
