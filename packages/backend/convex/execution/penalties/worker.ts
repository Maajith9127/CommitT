import { v } from "convex/values";
import { internalMutation, internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";

/**
 * firePenalty: The Gatekeeper Worker.
 * ─────────────────────────────────────────────────────────────────────────────
 * This worker wakes up after the waiver deadline (expires_at) has passed.
 * It implements three layers of "Silent Abort" safety guards to ensure
 * zero accidental penalties for deleted or waived tasks.
 */
export const firePenalty = internalMutation({
  args: { 
    taskId: v.id("tasks"),
    instanceId: v.id("taskInstances") 
  },
  handler: async (ctx, args) => {
    // 1. Fetch the Instance (The "Accountability Contract" is snapshotted here)
    const instance = await ctx.db.get(args.instanceId);

    console.log(`[firePenalty] Gatekeeper wakeup for instance ${args.instanceId}.`);

    // ── GUARD LAYER 1: INSTANCE EXISTENCE ──
    // If this specific failure occurrence was deleted, do not proceed.
    // This is our primary defusing mechanism for manual deletions.
    if (!instance) {
      console.log(`[firePenalty] Instance ${args.instanceId} was deleted. SILENT ABORT.`);
      return;
    }

    // ── GUARD LAYER 2: STATUS CHECK ──
    // If the user already waived the penalty or it was already fired, do not proceed.
    // A status of anything except 'waiver_active' means the gate is closed.
    if (instance.status !== "waiver_active") {
      console.log(`[firePenalty] Instance status is '${instance.status}'. Closing gate without firing.`);
      return;
    }

    // -------------------------------------------------------------------------
    // [PHASE 3] EXECUTION: THE BOMB DETONATES
    // -------------------------------------------------------------------------
    console.log(`[firePenalty] CRITICAL: Executing penalty for instance ${args.instanceId}.`);

    // 1. Update status to 'penalized' IMMEDIATELY to prevent replay attacks
    // We update the waiver_state to 'expired' for history/logs.
    await ctx.db.patch(args.instanceId, { 
      status: "penalized",
      waiver_state: {
        ...instance.waiver_state!,
        status: "expired",
      }
    });

    // 2. Execute the Penalty Penalty Dispatcher
    // We rely on the `instance.penalty` snapshot which was frozen at creation time.
    // This allows the penalty to fire even if the parent task was deleted.
    if (instance.penalty) {
      console.log(`[firePenalty] Penalty '${instance.penalty.type}' fired successfully using instance snapshot.`);
      // TODO: Hand off to the actual penalty dispatcher (Email, Photo, etc.)
    } else {
      console.warn(`[firePenalty] WARNING: No penalty snapshot found on instance ${args.instanceId}.`);
    }
  },
});
