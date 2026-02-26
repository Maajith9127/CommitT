/**
 * verifyCondition — Server-Authoritative Time Verification (Step 1: Time Only)
 *
 * Flow:
 *  1. Authenticate the user (via authedMutation middleware)
 *  2. Fetch the instance by the ID the frontend sent
 *  3. Confirm the user OWNS this instance (assignee_id check)
 *  4. Run the time validator using the instance's start/end from the DB
 *  5. Patch the time condition's status in the DB
 *  6. Return the result
 */

import { v } from "convex/values";
import { authedMutation } from "../../middleware";
import { validateTime } from "../../core/verification/time";
import { Doc } from "../../_generated/dataModel";

export default authedMutation({
  args: {
    instanceId: v.id("taskInstances"),
    metricKey: v.string(),
  },

  handler: async (ctx, args) => {
    const { user } = ctx;
    const now = Date.now();

    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`[verify] User: ${user._id} | Instance: ${args.instanceId} | Metric: ${args.metricKey}`);
    console.log("═══════════════════════════════════════════════════════════════");

    // ── STEP 1: Fetch the instance from the DB ──
    const instance = await ctx.db.get(args.instanceId) as Doc<"taskInstances"> | null;
    if (!instance) {
      throw new Error("INSTANCE_NOT_FOUND: This task instance does not exist.");
    }

    // ── STEP 2: Ownership check — does this instance belong to this user? ──
    if (instance.assignee_id !== user._id) {
      console.warn(`[verify] SECURITY: User ${user._id} tried to verify instance owned by ${instance.assignee_id}`);
      throw new Error("UNAUTHORIZED: You do not own this task instance.");
    }

    // ── STEP 3: Sequence check — is this the user's NEXT pending instance by time? ──
    // Query using the time-ordered index, then filter for "pending" status.
    // .first() gives us the earliest-by-start pending instance for this user.
    const nextPending = await ctx.db
      .query("taskInstances")
      .withIndex("by_assignee_start", (q) =>
        q.eq("assignee_id", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (!nextPending || nextPending._id !== args.instanceId) {
      console.warn(`[verify] SEQUENCE: User tried to verify ${args.instanceId}, but next pending by time is ${nextPending?._id ?? "none"}`);
      throw new Error("NOT_NEXT_INSTANCE: This is not your next pending task. You can only verify the task you're supposed to do right now.");
    }

    console.log(`[verify] ✅ Sequence check passed — this IS the next pending instance`);

    // ── STEP 4: Handle TIME — it's implicit (not a DB condition) ──
    // Every instance has start/end. "time" just checks: are we within the window?
    if (args.metricKey === "time") {
      // Idempotency: only skip if already verified (success is final).
      // "failed" is NOT skipped — the user can retry.
      if (instance.time_status === "verified") {
        console.log(`[verify] Time already verified. Skipping.`);
        return { success: true, status: "verified", message: "Already verified." };
      }

      const context = { instanceStart: instance.start, instanceEnd: instance.end };
      const result = validateTime({}, { metric_key: "time", relation: "within", target: { type: "number", value: null } }, context);
      const newStatus = result.passed ? "verified" : "failed";

      console.log(`[verify] Time validation result:`, result);

      // ── PERSIST to DB — Convex reactivity pushes it live to the frontend ──
      await ctx.db.patch(args.instanceId, { time_status: newStatus as any });

      console.log(`[verify]  time_status → "${newStatus}" persisted to DB`);

      return {
        success: result.passed,
        status: newStatus,
        message: result.passed
          ? "Time verification passed! You're within the window."
          : (result as any).reason ?? "Time verification failed.",
      };
    }

    // ── STEP 5: For other metrics — find the condition in the DB ──
    const conditionIndex = instance.conditions.findIndex(
      (c: any) => c.metric_key === args.metricKey
    );

    if (conditionIndex === -1) {
      throw new Error(`CONDITION_NOT_FOUND: No condition with metric_key "${args.metricKey}" on this instance.`);
    }

    const condition = instance.conditions[conditionIndex];

    // ── STEP 6: Idempotency — only skip if already verified (final) ──
    const currentStatus = condition.status ?? "neutral";
    if (currentStatus === "verified") {
      console.log(`[verify] Condition "${args.metricKey}" already verified. Skipping.`);
      return { success: true, status: "verified", message: "Already verified." };
    }

    // ── STEP 7: Run the appropriate validator ──
    // TODO: Use validateEvidence() dispatcher for location/picture/video/partner
    const context = { instanceStart: instance.start, instanceEnd: instance.end };
    const result = validateTime({}, condition, context);

    console.log(`[verify] Validation result:`, result);

    // ── STEP 8: Patch only this condition's status ──
    const newStatus = result.passed ? "verified" : "failed";

    const updatedConditions = instance.conditions.map((c: any, i: number) => {
      if (i === conditionIndex) {
        return { ...c, status: newStatus };
      }
      return c;
    });

    await ctx.db.patch(args.instanceId, {
      conditions: updatedConditions,
    });

    console.log(`[verify] ✅ Condition "${args.metricKey}" → "${newStatus}"`);

    return {
      success: result.passed,
      status: newStatus,
      message: result.passed
        ? `Verification passed!`
        : (result as any).reason ?? "Verification failed.",
    };
  },
});
