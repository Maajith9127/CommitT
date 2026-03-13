import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { syncTaskSchedule } from "../scheduling/scheduler";
import { initializeWaiverChallenges } from "../../core/waivers/dispatcher";

/**
 * evaluateGradingVerdict
 * -----------------------------------------------------------------------------
 * CORE GRADING ENGINE: Analyzes instance telemetry to determine fulfillment.
 * 
 * This function evaluates the terminal pass/fail verdict by inspecting style-specific
 * telemetry metrics stored within the checkpoints array.
 * 
 * @param instance - The hydrated task instance document.
 * @returns boolean - Returns true if the criteria for FAILURE are met.
 */
function evaluateGradingVerdict(instance: any): boolean {
  const style = instance.config.verification_style;
  const checkpoints = instance.checkpoints || [];

  if (style === "stay_throughout") {
    // STAY_THROUGHOUT LOGIC: Tolerance-based verification.
    // The user must maintain a presence across multiple checkpoints.
    const config = instance.config.stay_throughout_config;
    const maxMissed = config?.max_missed_checkins ?? 0;
    
    // Evaluate missed checkpoints (where any condition status remains 'pending')
    const missedCount = checkpoints.filter((cp: any) => 
      Object.values(cp.verification_status).some(s => s === "pending")
    ).length;

    const isFailed = missedCount > maxMissed;
    console.log(`[evaluateGradingVerdict] Style: stay_throughout | Missed: ${missedCount}/${maxMissed} | Verdict: ${isFailed ? "FAIL" : "PASS"}`);
    return isFailed;
  } else {
    // JUST_SHOW_UP LOGIC: Point-in-time verification.
    // Fulfillment is granted if at least one checkpoint reached the 'verified' terminal state.
    const hasVerified = checkpoints.some((cp: any) => 
      Object.values(cp.verification_status).every(s => s === "verified")
    );
    const isFailed = !hasVerified;
    console.log(`[evaluateGradingVerdict] Style: just_show_up | Verified: ${hasVerified} | Verdict: ${isFailed ? "FAIL" : "PASS"}`);
    return isFailed;
  }
}

/**
 * armAccountabilityContract
 * -----------------------------------------------------------------------------
 * Transitions a failed task instance into an active waiver/redemption session.
 * 
 * This involves three atomic operations:
 * 1. Calculate and schedule the final penalty enforcement job.
 * 2. Initialize the crypto-graphic or behavioral challenges (Waiver Vault).
 * 3. Finalize the database state to 'waiver_active' to prevent further telemetry updates.
 */
export async function armAccountabilityContract(
  ctx: any, 
  instance: any, 
  baseTime: number,
  waiverStatus: "offered" | "in_progress" = "offered"
) {
  if (!instance.penalty || !instance.penalty_waiver) return;

  const deadlineMs = instance.penalty_waiver.deadline_minutes * 60 * 1000;
  const expiresAt = baseTime + deadlineMs;

  // Cleanup existing jobs to prevent duplicate enforcement (Safety Guard)
  if (instance.enforcement_job_id) {
    try { await ctx.scheduler.cancel(instance.enforcement_job_id); } catch (e) {}
  }

  // Schedule the Gatekeeper job for final penalty execution
  const enforcementJobId = await ctx.scheduler.runAt(
    expiresAt,
    internal.execution.penalties.worker.firePenalty,
    { taskId: instance.task_id, instanceId: instance._id }
  );

  // Deploy the Challenge Vault
  const challenges = await initializeWaiverChallenges(ctx, instance);

  await ctx.db.patch(instance._id, {
    status: "waiver_active",
    enforcement_job_id: enforcementJobId,
    waiver_state: {
      status: waiverStatus,
      opened_at: Date.now(),
      expires_at: expiresAt,
      challenges, 
    }
  });

  console.log(`[armAccountabilityContract] Accountability Armed for ${instance._id}. Expiration: ${new Date(expiresAt).toISOString()}`);
}

/**
 * runVerification
 * -----------------------------------------------------------------------------
 * SYSTEM HEARTBEAT: Finalizes the state of a habit instance at window close.
 * 
 * DESIGN RATIONALE: HEART-FIRST RECURSION
 * To ensure 100% chain continuity, we synchronize the future schedule BEFORE
 * processing the current outcome. This ensures that even if complex penalty logic
 * encounters errors, the next link in the scheduling chain is already safely persisted.
 */
export const runVerification = internalMutation({
  args: { 
    instanceId: v.id("taskInstances"),
    taskTitle: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);
    if (!instance) {
      console.log(`[runVerification] ABORT: Instance ${args.instanceId} not found. Chain integrity at risk.`);
      return;
    }

    const task = await ctx.db.get(instance.task_id);

    console.log("---------------------------------------------------------------");
    console.log(`[runVerification] RECONCILING: ${instance.title}`);
    console.log(`[runVerification] Current Status: ${instance.status}`);
    console.log("---------------------------------------------------------------");

    // PHASE 1: TEMPORAL RECURSION
    // Establish the future schedule before judging the present.
    await syncTaskSchedule(ctx, instance.task_id, true);
    console.log(`[runVerification] Heartbeat synchronized for task ${instance.task_id}.`);

    // PHASE 2: SOVEREIGN GRADING
    // Execute style-specific verification rules to determine the verdict.
    let isFailed = false;
    if (instance.status === "pending" || instance.status === "proceeding") {
       isFailed = evaluateGradingVerdict(instance);
    } else {
       console.log(`[runVerification] SKIP: Instance already in terminal state '${instance.status}'`);
       return;
    }

    // PHASE 3: VERDICT ENFORCEMENT
    if (isFailed) {
      console.log(`[runVerification] FAILURE: Initiating Accountability Contract for ${instance._id}`);
      if (instance.penalty && instance.penalty_waiver) {
        await armAccountabilityContract(ctx, instance, instance.end);
      } else {
        await ctx.db.patch(args.instanceId, { status: "failed" });
      }
    } else {
      console.log(`[runVerification] SUCCESS: Marking ${instance._id} as proceeded.`);
      await ctx.db.patch(args.instanceId, { status: "proceeded" });
    }

    if (!task) {
      console.log(`[runVerification] ORPHAN: Finalizing terminal state for deleted series ${instance.task_id}.`);
    }
  },
});
