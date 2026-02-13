import { MutationCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

/**
 * scheduleFirstInstance
 * ==========================================
 * Schedules the verification job for a given instance.
 * This is used to kick off the chain — only 1 scheduled function at a time.
 */
export async function scheduleFirstInstance(
  ctx: MutationCtx,
  instanceId: Id<"taskInstances">,
) {
  const instance = await ctx.db.get(instanceId);
  if (!instance) {
    console.log(`[scheduleFirstInstance] Instance ${instanceId} not found.`);
    return;
  }

  console.log(`[scheduleFirstInstance] Scheduling verification for ${instance.title} at ${new Date(instance.end).toISOString()}`);

  // Schedule verification to run at the END of this instance's time slot
  const scheduledJobId = await ctx.scheduler.runAt(
    instance.end,
    internal.execution.verification.runner.runVerification,
    { instanceId, taskTitle: instance.title },
  );

  // Link the job ID for cancellation
  await ctx.db.patch(instanceId, { scheduled_job_id: scheduledJobId });
}
