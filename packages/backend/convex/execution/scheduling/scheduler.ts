import { MutationCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

/**
 * syncTaskSchedule(ctx, taskId)
 * ==========================================
 * THE TEMPORAL BRAIN: This function ensures exactly ONE verification 
 * heartbeat exists for the next upcoming habit occurrence.
 *
 * It is IDEMPOTENT and SELF-HEALING.
 */
export async function syncTaskSchedule(
  ctx: MutationCtx,
  taskId: Id<"tasks">,
) {
  const now = Date.now();

  // 1. CLEANUP (Nuclear Option): Cancel ALL active heartbeats for this task series.
  // This is technically more expensive but provides 100% safety against "Stuck Alarms"
  // when instances are moved in time or reordered.
  const allInstances = await ctx.db
    .query("taskInstances")
    .withIndex("by_task", (q) => q.eq("task_id", taskId))
    .collect();

  for (const inst of allInstances) {
    if (inst.scheduled_job_id) {
      try { await ctx.scheduler.cancel(inst.scheduled_job_id); } catch (e) {}
      await ctx.db.patch(inst._id, { scheduled_job_id: undefined });
    }
  }

  // 2. DISCOVERY: Find the chromologically EARLIEST unresolved instance.
  // We include 'proceeding' to ensure active windows still have a final judging job.
  // We do NOT use gt("end", now) so the system can "Catch Up" on missed slots.
  const allApplicable = await ctx.db
    .query("taskInstances")
    .withIndex("by_task_end", (q) => q.eq("task_id", taskId))
    .filter((q) =>
      q.or(
        q.eq(q.field("status"), "pending"),
        q.eq(q.field("status"), "proceeding"),
      ),
    )
    .collect();

  const nextInstance = allApplicable[0];

  if (!nextInstance) {
    console.log(`[syncTaskSchedule] Chain Complete for task ${taskId}.`);
    return;
  }

  // Limit logging for large accounts
  const candidatesLog = allApplicable.slice(0, 3).map(i => `${i._id.slice(-4)}(${i.status})`).join(", ");
  console.log(`[syncTaskSchedule] DISCOVERY: Next candidate is ${nextInstance._id} (Ends: ${new Date(nextInstance.end).toLocaleTimeString()}). Found: [${candidatesLog}${allApplicable.length > 3 ? "..." : ""}]`);

  // 3. GHOST EXORCISM: Hard-purge overlapping duplicates.
  // Critical for Drag-and-Drop operations where a move might collide with an existing slot.
  if (allApplicable.length > 1) {
    for (let i = 1; i < allApplicable.length; i++) {
       const ghost = allApplicable[i];
       if (Math.abs(ghost.end - nextInstance.end) < 60000) {
         console.log(`[syncTaskSchedule] 👻 PURGING DUPLICATE: ${ghost._id} at ${new Date(ghost.end).toLocaleTimeString()}`);
         await ctx.db.delete(ghost._id); 
       }
    }
  }

  // 4. SCHEDULING: Locked Heartbeat
  const scheduledJobId = await ctx.scheduler.runAt(
    nextInstance.end,
    internal.execution.verification.runner.runVerification,
    { instanceId: nextInstance._id, taskTitle: nextInstance.title },
  );

  console.log(`[syncTaskSchedule] SUCCESS: Heartbeat ${scheduledJobId} locked to ${nextInstance._id} at ${new Date(nextInstance.end).toLocaleTimeString()}`);

  // 5. PERSIST: Link the job ID
  await ctx.db.patch(nextInstance._id, { scheduled_job_id: scheduledJobId });
}

/**
 * Keep legacy wrapper for backwards compatibility
 */
export async function scheduleFirstInstance(ctx: MutationCtx, instanceId: Id<"taskInstances">) {
  const inst = await ctx.db.get(instanceId);
  if (inst) await syncTaskSchedule(ctx, inst.task_id);
}
