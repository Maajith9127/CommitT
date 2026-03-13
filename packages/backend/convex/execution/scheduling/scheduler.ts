import { MutationCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

/**
 * syncTaskSchedule(ctx, taskId, force)
 * ==========================================
 * THE TEMPORAL BRAIN: Ensures exactly ONE verification 
 * heartbeat exists for the next upcoming occurrence.
 */
export async function syncTaskSchedule(
  ctx: MutationCtx,
  taskId: Id<"tasks">,
  force: boolean = true // Default to TRUE for maximum reliability on updates
) {
  const now = Date.now();

  // 1. DISCOVERY: Find the chromologically EARLIEST unresolved instance in the FUTURE.
  // We strictly use gt("end", now) so that the runner (currently executing at instance.end)
  // never self-cancels or gets stuck on the slot it's currently judging.
  const allApplicable = await ctx.db
    .query("taskInstances")
    .withIndex("by_task_end", (q) => q.eq("task_id", taskId).gt("end", now))
    .filter((q) =>
      q.or(
        q.eq(q.field("status"), "pending"),
        q.eq(q.field("status"), "proceeding"),
      ),
    )
    .collect();

  const nextInstance = allApplicable[0];

  if (!nextInstance) {
    console.log(`[syncTaskSchedule] Chain Complete/Idle for task ${taskId}.`);
    // Cleanup future strays only
    const strays = await ctx.db
      .query("taskInstances")
      .withIndex("by_task_end", (q) => q.eq("task_id", taskId).gt("end", now))
      .filter((q) => q.neq(q.field("scheduled_job_id"), undefined))
      .collect();
    for (const inst of strays) {
      try { await ctx.scheduler.cancel(inst.scheduled_job_id!); } catch (e) {}
      await ctx.db.patch(inst._id, { scheduled_job_id: undefined });
    }
    return;
  }

  // 2. SURGICAL CLEANUP: Only cancel jobs on instances ending AFTER our next target.
  // This avoids accidental self-cancellation of the currently running job.
  const othersToClean = await ctx.db
    .query("taskInstances")
    .withIndex("by_task_end", (q) => q.eq("task_id", taskId).gt("end", nextInstance.end))
    .filter((q) => q.neq(q.field("scheduled_job_id"), undefined))
    .collect();

  for (const inst of othersToClean) {
    console.log(`[syncTaskSchedule] SURGICAL_CLEANUP: Removing stray job on ${inst._id}`);
    try { await ctx.scheduler.cancel(inst.scheduled_job_id!); } catch (e) {}
    await ctx.db.patch(inst._id, { scheduled_job_id: undefined });
  }

  // 3. SCHEDULING: Locked Heartbeat
  // If not forced, we trust the existing ID.
  // In the runner/API, we default to force: true to ensure time-shifts are honored.
  if (nextInstance.scheduled_job_id && !force) {
    console.log(`[syncTaskSchedule] IDEMPOTENT: Heartbeat healthy for ${nextInstance._id}`);
    return;
  }

  // Purge the existing ID on the next instance if we are forcing/replacing
  if (nextInstance.scheduled_job_id) {
    try { await ctx.scheduler.cancel(nextInstance.scheduled_job_id); } catch (e) {}
  }

  const scheduledJobId = await ctx.scheduler.runAt(
    nextInstance.end,
    internal.execution.verification.runner.runVerification,
    { instanceId: nextInstance._id, taskTitle: nextInstance.title },
  );

  console.log(`[syncTaskSchedule] SUCCESS: Heartbeat ${scheduledJobId} locked to ${nextInstance._id} (Forced: ${force})`);

  // 4. PERSIST
  await ctx.db.patch(nextInstance._id, { scheduled_job_id: scheduledJobId });
}

export async function scheduleFirstInstance(ctx: MutationCtx, instanceId: Id<"taskInstances">) {
  const inst = await ctx.db.get(instanceId);
  if (inst) await syncTaskSchedule(ctx, inst.task_id);
}
