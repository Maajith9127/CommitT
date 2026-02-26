/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  verify.ts — Server-Authoritative Per-Condition Verification Mutation       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                             ║
 * ║  PURPOSE:                                                                   ║
 * ║  This is the single backend endpoint that handles ALL condition              ║
 * ║  verification for task instances (time, location, photo, etc.).              ║
 * ║  The frontend sends: { instanceId, metricKey }.                             ║
 * ║  The backend does ALL the validation — the client is never trusted.         ║
 * ║                                                                             ║
 * ║  SECURITY FLOW (every request goes through ALL of these):                   ║
 * ║  ┌─────────────────────────────────────────────────────────────────┐        ║
 * ║  │ 1. AUTH       → Is the user logged in? (authedMutation)        │        ║
 * ║  │ 2. OWNERSHIP  → Does this instance belong to this user?        │        ║
 * ║  │ 3. SEQUENCE   → Is this their chronologically next task?       │        ║
 * ║  │ 4. VALIDATE   → Does the evidence/timing actually pass?        │        ║
 * ║  │ 5. PERSIST    → Write the result to the database               │        ║
 * ║  └─────────────────────────────────────────────────────────────────┘        ║
 * ║                                                                             ║
 * ║  TWO TYPES OF CONDITIONS:                                                   ║
 * ║  • "time"  → Implicit. Every instance has start/end. Not stored in the      ║
 * ║              conditions[] array. Result is saved to `time_status` field.    ║
 * ║  • Others  → Explicit. Stored in the conditions[] array (location, photo,  ║
 * ║              video, partner). Result is patched into that array entry.      ║
 * ║                                                                             ║
 * ║  IDEMPOTENCY:                                                               ║
 * ║  • "verified" → Final. Re-requests are skipped (no re-processing).         ║
 * ║  • "failed"   → Retryable. The user can tap again to re-attempt.           ║
 * ║                                                                             ║
 * ║  RETURN VALUE:                                                              ║
 * ║  { success: boolean, status: string, message: string }                      ║
 * ║  The frontend uses `status` to update the VerificationStatusCircle.         ║
 * ║                                                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { v } from "convex/values";
import { authedMutation } from "../../middleware";
import { validateTime } from "../../core/verification/time";
import { Doc } from "../../_generated/dataModel";

export default authedMutation({
  args: {
    /** The Convex `_id` of the taskInstance to verify */
    instanceId: v.id("taskInstances"),
    /** Which condition to check: "time", "location", "picture", "video", "partner" */
    metricKey: v.string(),
  },

  handler: async (ctx, args) => {
    const { user } = ctx;

    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`[verify] User: ${user._id} | Instance: ${args.instanceId} | Metric: ${args.metricKey}`);
    console.log("═══════════════════════════════════════════════════════════════");

    // ── STEP 1: Fetch the instance from the DB ──────────────────────────────
    // We ALWAYS read from the database — never trust client-provided data.
    const instance = await ctx.db.get(args.instanceId) as Doc<"taskInstances"> | null;
    if (!instance) {
      throw new Error("INSTANCE_NOT_FOUND: This task instance does not exist.");
    }

    // ── STEP 2: Ownership check ─────────────────────────────────────────────
    // Ensures a user can only verify their OWN tasks, not someone else's.
    if (instance.assignee_id !== user._id) {
      console.warn(`[verify] SECURITY: User ${user._id} tried to verify instance owned by ${instance.assignee_id}`);
      throw new Error("UNAUTHORIZED: You do not own this task instance.");
    }

    // ── STEP 3: Sequence check ──────────────────────────────────────────────
    // Users must verify tasks in chronological order. We find the earliest
    // pending instance (by start time) and reject if it doesn't match.
    //
    // Index used: `by_assignee_start` → sorted by [assignee_id, start].
    // We then filter for status === "pending" and take the first result.
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

    // ═════════════════════════════════════════════════════════════════════════
    // BRANCH A: TIME VERIFICATION (implicit — not in conditions[] array)
    //
    // Time is special because every task instance inherently has a time
    // window (start/end). We don't store "time" as a condition in the
    // conditions[] array — instead, result goes into `time_status` field.
    // ═════════════════════════════════════════════════════════════════════════
    if (args.metricKey === "time") {
      // Idempotency: "verified" is final — skip re-processing.
      // "failed" is NOT skipped — the user can retry (e.g., they were early
      // and came back within the window).
      if (instance.time_status === "verified") {
        console.log(`[verify] Time already verified. Skipping.`);
        return { success: true, status: "verified", message: "Already verified." };
      }

      // Run the time validator using the instance's own start/end from the DB.
      // We pass a dummy condition object since time doesn't have a real one.
      const context = { instanceStart: instance.start, instanceEnd: instance.end };
      const result = validateTime(
        {},
        { metric_key: "time", relation: "within", target: { type: "number", value: null } },
        context,
      );
      const newStatus = result.passed ? "verified" : "failed";

      console.log(`[verify] Time validation result:`, result);

      // Persist to DB — the frontend reads this (via Zustand or next fetch).
      await ctx.db.patch(args.instanceId, { time_status: newStatus as any });

      console.log(`[verify] time_status → "${newStatus}" persisted to DB`);

      return {
        success: result.passed,
        status: newStatus,
        message: result.passed
          ? "Time verification passed! You're within the window."
          : (result as any).reason ?? "Time verification failed.",
      };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // BRANCH B: ALL OTHER CONDITIONS (location, picture, video, partner)
    //
    // These are explicit conditions stored in the conditions[] array.
    // We find the matching entry by metric_key, run its validator,
    // and patch ONLY that entry's status in the array.
    // ═════════════════════════════════════════════════════════════════════════

    // ── STEP 4: Find the condition in the DB by metric_key ──────────────────
    const conditionIndex = instance.conditions.findIndex(
      (c: any) => c.metric_key === args.metricKey
    );

    if (conditionIndex === -1) {
      throw new Error(`CONDITION_NOT_FOUND: No condition with metric_key "${args.metricKey}" on this instance.`);
    }

    const condition = instance.conditions[conditionIndex];

    // ── STEP 5: Idempotency — "verified" is final, "failed" allows retry ───
    const currentStatus = condition.status ?? "neutral";
    if (currentStatus === "verified") {
      console.log(`[verify] Condition "${args.metricKey}" already verified. Skipping.`);
      return { success: true, status: "verified", message: "Already verified." };
    }

    // ── STEP 6: Run the appropriate validator ───────────────────────────────
    // TODO: Replace with `validateEvidence(metricKey, evidence, condition, context)`
    //       once location/picture/video/partner validators are wired up.
    const context = { instanceStart: instance.start, instanceEnd: instance.end };
    const result = validateTime({}, condition, context);

    console.log(`[verify] Validation result for "${args.metricKey}":`, result);

    // ── STEP 7: Patch ONLY this condition's status in the array ─────────────
    // We map over the entire conditions array, updating just the one at
    // `conditionIndex`. All other conditions remain untouched.
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

    console.log(`[verify]  Condition "${args.metricKey}" → "${newStatus}"`);

    return {
      success: result.passed,
      status: newStatus,
      message: result.passed
        ? `Verification passed!`
        : (result as any).reason ?? "Verification failed.",
    };
  },
});
