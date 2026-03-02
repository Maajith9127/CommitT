/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  verify.ts — Server-Authoritative Per-Condition Verification Mutation        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  PURPOSE:                                                                    ║
 * ║  This is the core backend endpoint orchestrating all cryptographic, GPS,     ║
 * ║  and media condition verifications (Time, Location, Photo, Video, etc.).     ║
 * ║  The frontend sends `{ instanceId, metricKey, evidence }`.                   ║
 * ║  The backend validates ALL parameters independently. The client is untrusted.║
 * ║                                                                              ║
 * ║  ARCHITECTURE (The Verification Pipeline):                                   ║
 * ║  ┌──────────────────────────────────────────────────────────────────┐        ║
 * ║  │ 1. AUTH        → Cryptographically verify user identity          │        ║
 * ║  │ 2. OWNERSHIP   → Enforce Multi-Tenant Isolation (can't spoof)    │        ║
 * ║  │ 3. SEQUENCE    → Strict Chronological execution gating           │        ║
 * ║  │ 4. TIME LOCK   → Verify operation is strictly within time limits │        ║
 * ║  │ 5. DISPATCH    → Branch to explicit condition validators         │        ║
 * ║  └──────────────────────────────────────────────────────────────────┘        ║
 * ║                                                                              ║
 * ║  THE TWO CORE MODES:                                                         ║
 * ║                                                                              ║
 * ║  1. "Just Show Up" (Default Mode)                                            ║
 * ║     User must pass the condition validation exactly ONCE within the entire   ║
 * ║     session window. State is mutated directly on the Master Condition list.  ║
 * ║                                                                              ║
 * ║  2. "Stay Throughout" (Continuous Mode)                                      ║
 * ║     A highly advanced strict accountability mode. Validates the user across  ║
 * ║     random, unpredictable 5-minute checkpoint pings. Verification updates    ║
 * ║     are dynamically sandboxed to the active Checkpoint Root Map dict.      ║
 * ║     The master state relies entirely on an aggregated cron evaluation.       ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { v } from "convex/values";
import { authedMutation } from "../../middleware";
import { validateEvidence } from "../../core/verification/evidenceValidators";
import { Doc } from "../../_generated/dataModel";

export default authedMutation({
  args: {
    /** The Convex `_id` of the taskInstance to verify */
    instanceId: v.id("taskInstances"),
    /** Which condition to check: "time", "location", "picture", "video", "partner" */
    metricKey: v.string(),
    /** Optional evidence payload (e.g., { lat, lng } for location) */
    evidence: v.optional(v.any()),
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
      return { success: false, status: "failed", message: "This task instance does not exist." };
    }

    // ── STEP 2: Ownership check ─────────────────────────────────────────────
    // Ensures a user can only verify their OWN tasks, not someone else's.
    if (instance.assignee_id !== user._id) {
      console.warn(`[verify] SECURITY: User ${user._id} tried to verify instance owned by ${instance.assignee_id}`);
      return { success: false, status: "failed", message: "You do not own this task instance." };
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
      return { success: false, status: "failed", message: "This is not your next pending task. You can only verify the task you're supposed to do right now." };
    }

    console.log(`[verify]  Sequence check passed — this IS the next pending instance`);

    // ── STEP 3.5: Implicit Time Window Check ─────────────────────────────────
    // Every task instance must be completed within its designated time window.
    // We implicitly check Date.now() against the start/end bounds.
    // If the check fails, the transaction is rejected before processing any evidence.
    
    const now = Date.now();
    if (now < instance.start) {
      console.warn(`[verify] TIME: Task has not started yet. (Start: ${instance.start}, Now: ${now})`);
      return { success: false, status: "failed", message: "The active window for this task has not started yet." };
    }
    
    if (now > instance.end) {
      console.warn(`[verify] TIME: Task has expired. (End: ${instance.end}, Now: ${now})`);
      return { success: false, status: "failed", message: "The active window for this task has expired." };
    }
    
    console.log(`[verify]  Implicit time check passed — within active window`);

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
      return { success: false, status: "failed", message: `No condition with metric_key "${args.metricKey}" on this instance.` };
    }

    const condition = instance.conditions[conditionIndex];

    // ── STEP 5: Core Loop - Checkpoint-Based Verification ──────────────────
    if (instance.config.verification_style === "stay_throughout" || instance.config.verification_style === "just_show_up") {
      // ═════════════════════════════════════════════════════════════════════════
      // UNIFIED CHECKPOINT BRANCH — Handles Persistent & Arrival windows
      // ═════════════════════════════════════════════════════════════════════════
      if (!instance.checkpoints || instance.checkpoints.length === 0) {
        return { success: true, status: "neutral", message: "No verification windows generated yet." };
      }

      // 1. Locate the specifically active checkpoint window.
      const activeCheckpointIndex = instance.checkpoints.findIndex((cp: any) => 
        now >= (cp.start ?? cp.scheduled_time) && now <= (cp.end ?? cp.window_end_time)
      );

      if (activeCheckpointIndex === -1) {
         const message = instance.config.verification_style === "stay_throughout"
           ? "There are no active random check-ins for you right now. Sit tight!"
           : "You are outside the valid arrival/grace window for this task.";
         return { success: false, status: "failed", message };
      }

      const activeCheckpoint = instance.checkpoints[activeCheckpointIndex];
      const currentStatus = activeCheckpoint.verification_status?.[args.metricKey] ?? "pending";
      
      // Idempotency: "verified" is final. "failed" inside the window allows a retry!
      if (currentStatus === "verified") {
        console.log(`[verify] Condition "${args.metricKey}" already verified for this checkpoint.`);
        return { success: true, status: "verified", message: "Checkpoint already verified." };
      }

      // 2. Execute the normal GPS/Picture Physics check
      const context = { instanceStart: instance.start, instanceEnd: instance.end };
      const result = validateEvidence(args.metricKey, args.evidence, condition, context);
      const newStatus = result.passed ? "verified" : "failed";

      // 3. Patch ONLY the verification_status dictionary on the active checkpoint
      const updatedCheckpoints = [...instance.checkpoints];
      updatedCheckpoints[activeCheckpointIndex] = {
        ...activeCheckpoint,
        verification_status: {
          ...(activeCheckpoint.verification_status || {}),
          [args.metricKey]: newStatus,
        },
        completed_at: result.passed ? now : activeCheckpoint.completed_at
      };

      // 4. Save back to the DB.
      await ctx.db.patch(args.instanceId, { checkpoints: updatedCheckpoints as any });

      let finalMessage = result.passed ? `Checkpoint condition verified!` : ((result as any).reason ?? "Checkpoint failed.");
      return { success: result.passed, status: newStatus, message: finalMessage };
    } 
    else {
      // ═════════════════════════════════════════════════════════════════════════
      // DEFAULT 'JUST SHOW UP / TIME BOUND' BRANCH
      // ═════════════════════════════════════════════════════════════════════════
      // ── STEP 5B: Idempotency — "verified" is final, "failed" allows retry ───
      const currentStatus = condition.status ?? "neutral";
      if (currentStatus === "verified") {
        console.log(`[verify] Condition "${args.metricKey}" already verified. Skipping.`);
        return { success: true, status: "verified", message: "Already verified." };
      }

      // ── STEP 6B: Run the appropriate validator ───────────────────────────────
      const context = { instanceStart: instance.start, instanceEnd: instance.end };
      const result = validateEvidence(args.metricKey, args.evidence, condition, context);

      console.log(`[verify] Validation result for "${args.metricKey}":`, result);

      // ── STEP 7B: Patch ONLY this condition's status in the array ─────────────
      const newStatus = result.passed ? "verified" : "failed";

      const updatedConditions = instance.conditions.map((c: any, i: number) => {
        if (i === conditionIndex) {
          return { ...c, status: newStatus };
        }
        return c;
      });

      // ── STEP 8B: Check if ALL conditions are now strictly verified ───────────
      const allVerified = updatedConditions.every(
        (c: any) => c.status === "verified" || c.status === "applied" || c.status === "waived"
      );

      let nextInstanceStatus = instance.status;
      let finalMessage = result.passed ? `Verification passed!` : ((result as any).reason ?? "Verification failed.");

      if (result.passed && allVerified) {
        nextInstanceStatus = "proceeded"; // Fully verified
        finalMessage = "All conditions verified! Task marked as complete.";
      } else if (result.passed && instance.status === "pending") {
        nextInstanceStatus = "proceeding"; // Partially verified
      }

      await ctx.db.patch(args.instanceId, {
        conditions: updatedConditions,
        status: nextInstanceStatus as any,
      });

      console.log(`[verify]  Condition "${args.metricKey}" → "${newStatus}"`);
      if (result.passed && allVerified) {
        console.log(`[verify]  All conditions passed! Instance ${args.instanceId} marked as "proceeded".`);
      }

      return {
        success: result.passed,
        status: newStatus,
        message: finalMessage,
      };
    }
  },
});
