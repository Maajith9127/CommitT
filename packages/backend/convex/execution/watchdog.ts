import { internalMutation } from "../_generated/server";
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
      // Discovery: Find the earliest unresolved heartbeat target.
      // We use 'by_task_end' to match the scheduler's discovery logic.
      const nextPending = await ctx.db
        .query("taskInstances")
        .withIndex("by_task_end", (q) => q.eq("task_id", task._id))
        .filter((q) => q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "proceeding"),
        ))
        .first();

      // If we have an unresolved instance but no job is linked, sync it!
      if (nextPending && !nextPending.scheduled_job_id) {
        console.log(`[Watchdog] Healing orphaned task: ${task.title} (ID: ${task._id})`);
        await syncTaskSchedule(ctx, task._id);
        healedCount++;
      }
    }

    return { status: "success", tasksChecked: allTasks.length, tasksHealed: healedCount };
  },
});
