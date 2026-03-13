import { MutationCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

/**
 * syncTaskSchedule(ctx, taskId, force)
 * ==========================================
 * THE TEMPORAL BRAIN: This function is the "Reconciler" for the CommitT 
 * accountability chain. It ensures exactly ONE authoritative verification 
 * heartbeat exists for the next upcoming habit occurrence.
 *
 * DESIGN PRINCIPLES:
 * 1. TEMPORAL FIREWALL: Uses gt("end", now) to strictly look PAST the current
 *    execution window, preventing self-cancellation during runner execution.
 * 2. SURGICAL CLEANUP: Only cancels stray jobs in the future, avoiding job flicker.
 * 3. REACTIVE OVERRIDES: 'force: true' ensures drag-and-drop time shifts are applied.
 */
export async function syncTaskSchedule(
  ctx: MutationCtx,
  taskId: Id<"tasks">,
  force: boolean = true // Default to true for maximum reliability on updates
) {
  const now = Date.now();

  // ─── PHASE 1: CHRONOLOGICAL DISCOVERY ───
  // Find the chronologically earliest unresolved instance in the FUTURE.
  // CRITICAL: We look strictly PAST 'now' to avoid colliding with active sessions.
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
    
    // Safety cleanup of any lingering future stray jobs
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

  // ─── PHASE 2: SURGICAL CLEANUP ───
  // Cancel jobs ONLY on instances ending AFTER our next target.
  // This prevents self-cancellation of the currently running job.
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

  // ─── PHASE 3: SCHEDULING ───
  // If not forced, return early to save resources (Performance).
  if (nextInstance.scheduled_job_id && !force) {
    console.log(`[syncTaskSchedule] IDEMPOTENT: Heartbeat healthy for ${nextInstance._id}`);
    return;
  }

  // Purge the old ID before replacement to ensure zero-stale pointers
  if (nextInstance.scheduled_job_id) {
    try { await ctx.scheduler.cancel(nextInstance.scheduled_job_id); } catch (e) {}
  }

  const scheduledJobId = await ctx.scheduler.runAt(
    nextInstance.end,
    internal.execution.verification.runner.runVerification,
    { instanceId: nextInstance._id, taskTitle: nextInstance.title },
  );

  console.log(`[syncTaskSchedule] SUCCESS: Heartbeat ${scheduledJobId} locked to ${nextInstance._id} at ${new Date(nextInstance.end).toLocaleTimeString()} (Forced: ${force})`);

  // ─── PHASE 4: PERSISTENCE ───
  await ctx.db.patch(nextInstance._id, { scheduled_job_id: scheduledJobId });
}

export async function scheduleFirstInstance(ctx: MutationCtx, instanceId: Id<"taskInstances">) {
  const inst = await ctx.db.get(instanceId);
  if (inst) await syncTaskSchedule(ctx, inst.task_id);
}
