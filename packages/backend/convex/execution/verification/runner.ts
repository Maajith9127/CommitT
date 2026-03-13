import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { syncTaskSchedule } from "../scheduling/scheduler";
import { initializeWaiverChallenges } from "../../core/waivers/dispatcher";

/**
 * armAccountabilityContract(): The "Redemption Arc" Initiator.
 * 
 * DESIGN RATIONALE (PRODUCTION GRADE):
 * This logic is decoupled from the main verification flow to allow for two distinct triggers:
 * 1. AUTOMATIC: Triggered when a task window ends and the user hasn't verified (Failure).
 * 2. PRE-EMPTIVE: Triggered if a user manually starts a waiver session before the window ends.
 * 
 * @param ctx - The mutation context
 * @param instance - The task instance document
 * @param baseTime - The reference point for the deadline (e.g., instance.end or Date.now())
 * @param waiverStatus - The status to set for the waiver session (offered | in_progress)
 */
export async function armAccountabilityContract(
  ctx: any, 
  instance: any, 
  baseTime: number,
  waiverStatus: "offered" | "in_progress" = "offered"
) {
  if (!instance.penalty || !instance.penalty_waiver) return;

  // 1. DEXTEROUS TIMING CALCULATION
  // Restore real deadline (using provided user setting)
  const deadlineMs = instance.penalty_waiver.deadline_minutes * 60 * 1000;
  const expiresAt = baseTime + deadlineMs;

  // 2. IDEMPOTENCY CHECK (Safety Guard)
  if (instance.enforcement_job_id) {
    try {
      await ctx.scheduler.cancel(instance.enforcement_job_id);
    } catch (e) {
      console.log(`[armAccountabilityContract] Job already fired or non-existent.`);
    }
  }

  // 3. ARM THE GATEKEEPER (The Penalty "Bomb")
  const enforcementJobId = await ctx.scheduler.runAt(
    expiresAt,
    internal.execution.penalties.worker.firePenalty,
    { 
      taskId: instance.task_id,
      instanceId: instance._id 
    }
  );

  // 4. TRANSITION TO WAIVER STATE & INITIALIZE CHALLENGE VAULT
  const challenges = await initializeWaiverChallenges(ctx, instance);

  await ctx.db.patch(instance._id, {
    status: "waiver_active",
    enforcement_job_id: enforcementJobId,
    waiver_state: {
      status: waiverStatus,
      opened_at: Date.now(),
      expires_at: expiresAt,
      challenges, // The pre-generated queue of tasks
    }
  });

  console.log(`[armAccountabilityContract] Accountability Armed for ${instance._id}. Expires: ${new Date(expiresAt).toISOString()}`);
}

/**
 * runVerification(): The heartbeat of the system.
 * This function runs automatically at the end of every time slot.
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

    const task = await ctx.db.get(instance.task_id);

    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`[runVerification] VERIFYING: ${instance.title}`);
    console.log(`[runVerification] Evidence  : ${instance.status}`);
    console.log("═══════════════════════════════════════════════════════════════");

    // -------------------------------------------------------------------------
    // [PHASE 1] THE TEMPORAL RECURSION (SELF-HEALING HEARTBEAT)
    // -------------------------------------------------------------------------
    // CRITICAL: We sync the schedule FIRST. 
    // We use 'force: true' to ensure any stale job IDs are purged and replaced.
    await syncTaskSchedule(ctx, instance.task_id, true);
    console.log(`[runVerification] Heartbeat synchronized for task ${instance.task_id}.`);

    // -------------------------------------------------------------------------
    // [PHASE 2] VERIFICATION & GRADING
    // -------------------------------------------------------------------------
    const isFailed = instance.status === "pending"; 

    if (isFailed) {
      console.log(`[runVerification] FAILURE DETECTED: Arming accountability for ${instance._id}`);
      if (instance.penalty && instance.penalty_waiver) {
        await armAccountabilityContract(ctx, instance, instance.end);
      } else {
        await ctx.db.patch(args.instanceId, { status: "failed" });
      }
    } else if (instance.status === "proceeding") {
      console.log(`[runVerification] SUCCESS: Marking ${instance._id} as proceeded.`);
      await ctx.db.patch(args.instanceId, { status: "proceeded" });
    }

    if (!task) {
      console.log(`[runVerification] Orphaned Instance Processed (Task: ${instance.task_id}).`);
    }
  },
});
