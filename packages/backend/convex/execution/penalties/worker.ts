import { v } from "convex/values";
import { internalMutation, internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Doc } from "../../_generated/dataModel";
import { dispatch } from "../../core/penalties/dispatcher";

/**
 * firePenalty: The Gatekeeper Worker.
 * ─────────────────────────────────────────────────────────────────────────────
 * This worker wakes up after the waiver deadline (expires_at) has passed.
 * It implements three layers of "Silent Abort" safety guards to ensure
 * zero accidental penalties for deleted or waived tasks.
 */
/**
 * firePenalty: The Gatekeeper (Mutation).
 * ─────────────────────────────────────────────────────────────────────────────
 * This mutation handles the state transition. It marks the instance as 
 * "penalized" to lock the database state before triggering the external side-effect.
 */
export const firePenalty = internalMutation({
  args: { 
    taskId: v.id("tasks"),
    instanceId: v.id("taskInstances") 
  },
  handler: async (ctx, args) => {
    const instance = await ctx.db.get(args.instanceId);

    if (!instance || instance.status !== "waiver_active") {
      console.log(`[firePenalty] Gatekeeper: Instance inactive or deleted. Aborting.`);
      return;
    }

    // 1. LOCK STATE: Update status to 'penalized' IMMEDIATELY
    await ctx.db.patch(args.instanceId, { 
      status: "penalized",
      waiver_state: {
        ...instance.waiver_state!,
        status: "expired",
      }
    });

    // 2. TRIGGER EFFECT: Schedule the Action to handle the fetch() call
    // We use a scheduler with 0 delay to move into the Action sandbox immediately
    await ctx.scheduler.runAfter(0, internal.execution.penalties.worker.firePenaltyAction, {
      instanceId: args.instanceId
    });

    console.log(`[firePenalty] State locked. Action scheduled for instance ${args.instanceId}.`);
  },
});

/**
 * firePenaltyAction: The Executor (Action).
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the only place where side-effects like fetch() are allowed.
 */
export const firePenaltyAction = internalAction({
  args: { 
    instanceId: v.id("taskInstances") 
  },
  handler: async (ctx, args) => {
    console.log(`[firePenaltyAction] Effector wakeup for instance ${args.instanceId}.`);

    // 1. Fetch the snapshotted data (using runQuery because Actions can't use ctx.db)
    const instance = await ctx.runQuery(internal.api.instances.read.getInstance, {
      instanceId: args.instanceId
    });

    if (!instance || !instance.penalty) {
      console.warn(`[firePenaltyAction] No valid instance or penalty found for ${args.instanceId}.`);
      return;
    }

    // 2. DETONATE: Call the dispatcher
    // Since we are in an Action, we pass the 'ctx' which allows the dispatcher
    // to perform Action-only feats (like fetch).
    const result = await dispatch(ctx, instance as Doc<"taskInstances">);

    if (result?.success) {
      console.log(`[firePenaltyAction] SUCCESS: Penalty executed for ${args.instanceId}.`);
    } else {
      console.error(`[firePenaltyAction] FAILURE:`, result?.error);
    }
  },
});
