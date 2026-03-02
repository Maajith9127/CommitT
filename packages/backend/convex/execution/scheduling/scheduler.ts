import { MutationCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

/**
 * syncTaskSchedule(ctx, taskId)
 * ==========================================
 * The "Temporal Brain" of the system. This function ensures that exactly
 * ONE verification job is scheduled for the next upcoming pending instance.
 *
 * It is IDEMPOTENT and SELF-HEALING:
 * 1. It wipes any existing future scheduled jobs for this task.
 * 2. It finds the EARLIEST 'pending' instance in the future.
 * 3. It schedules the verification runner for that instance's 'end' time.
 */
export async function syncTaskSchedule(
  ctx: MutationCtx,
  taskId: Id<"tasks">,
) {
  const now = Date.now();

  // 1. CLEANUP: Find all instances for this task and cancel any active jobs
  // This prevents "Zombie Alarms" if a task was moved or edited.
  const allInstances = await ctx.db
    .query("taskInstances")
    .withIndex("by_task", (q) => q.eq("task_id", taskId))
    .collect();

  for (const inst of allInstances) {
    if (inst.scheduled_job_id) {
      try {
        await ctx.scheduler.cancel(inst.scheduled_job_id);
      } catch (e) {
        // Job might have already completed or triggered, safe to ignore
      }
      await ctx.db.patch(inst._id, { scheduled_job_id: undefined });
    }
  }

  // 2. DISCOVERY: Find the next pending occurrence
  // We look for the earliest [Pending] instance that hasn't finished yet.
  const nextInstance = await ctx.db
    .query("taskInstances")
    .withIndex("by_task", (q) => q.eq("task_id", taskId))
    .filter((q) => q.and(
      q.eq(q.field("status"), "pending"),
      q.gt(q.field("end"), now)
    ))
    .first(); // Earliest one due to DB insertion order/start time

  if (!nextInstance) {
    console.log(`[syncTaskSchedule] No future pending instances found for task ${taskId}. Schedule complete.`);
    return;
  }

  // 3. SCHEDULING: Set the heartbeat for the next slot
  console.log(`[syncTaskSchedule] Scheduling verification for "${nextInstance.title}" at ${new Date(nextInstance.end).toISOString()}`);

  const scheduledJobId = await ctx.scheduler.runAt(
    nextInstance.end,
    internal.execution.verification.runner.runVerification,
    { instanceId: nextInstance._id, taskTitle: nextInstance.title },
  );

  // 4. PERSIST: Link the job ID back for future syncs/cancellations
  await ctx.db.patch(nextInstance._id, { scheduled_job_id: scheduledJobId });
}

/**
 * Keep legacy wrapper for backwards compatibility during refactor
 */
export async function scheduleFirstInstance(ctx: MutationCtx, instanceId: Id<"taskInstances">) {
  const inst = await ctx.db.get(instanceId);
  if (inst) await syncTaskSchedule(ctx, inst.task_id);
}
