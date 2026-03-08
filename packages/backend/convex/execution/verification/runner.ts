import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { syncTaskSchedule } from "../scheduling/scheduler";

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

  // 4. TRANSITION TO WAIVER STATE
  await ctx.db.patch(instance._id, {
    status: "waiver_active",
    enforcement_job_id: enforcementJobId,
    waiver_state: {
      status: waiverStatus,
      opened_at: Date.now(),
      expires_at: expiresAt,
    }
  });

  console.log(`[armAccountabilityContract] Accountability Armed for ${instance._id}. Expires: ${new Date(expiresAt).toISOString()}`);
}

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

    // 2. Sovereign Instance Execution
    // DESIGN RATIONALE: We do NOT return early if the task is deleted.
    // If an instance exists (especially a 'Manual Edit'), it is a sovereign 
    // contract that must be honored. Even if the parent habit is gone, 
    // this specific occurrence must reach a terminal state (proceeded/failed/waived).
    const task = await ctx.db.get(instance.task_id);

    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`[runVerification] VERIFYING: ${instance.title}`);
    console.log(`[runVerification] Evidence  : ${instance.status}`);
    console.log("═══════════════════════════════════════════════════════════════");

    // -------------------------------------------------------------------------
    // [PHASE 1] VERIFICATION & GRADING
    // -------------------------------------------------------------------------
    // Sovereign Grading: We process the outcome based on the instance's own state.
    const isFailed = instance.status === "pending"; 

    if (isFailed) {
      // ── TRIGGER REDEMPTION ARC ──
      // If a contract exists, we arm it using 'instance.end' as the base time.
      if (instance.penalty && instance.penalty_waiver) {
        await armAccountabilityContract(ctx, instance, instance.end);
      } else {
        // No contract exists. Hard failure.
        await ctx.db.patch(args.instanceId, { status: "failed" });
      }
    } else if (instance.status === "proceeding") {
      // Transition to terminal success
      await ctx.db.patch(args.instanceId, { status: "proceeded" });
    }

    // -------------------------------------------------------------------------
    // [PHASE 2] THE HEARTBEAT (SELF-HEALING)
    // -------------------------------------------------------------------------
    // We only attempt to sync the future schedule if the parent task still exists.
    // This prevents the system from trying to revive a deleted habit series.
    if (task) {
      await syncTaskSchedule(ctx, instance.task_id);
      console.log(`[runVerification] Heartbeat sync complete for task ${instance.task_id}.`);
    } else {
      console.log(`[runVerification] Parent task deleted. Skipping heartbeat.`);
    }
  },
});
