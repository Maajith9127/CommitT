import { v } from "convex/values";

import { visibilityEnum } from "../../config/enums";
import { RecurrenceSchema, ConditionsSchema, ConfigSchema, PenaltySchema, PenaltyWaiverSchema } from "../../lib/validators";
import { updateInternal } from "../../core/commitments/service";

import { authedMutation } from "../../middleware";

/**
 * Updates an existing commitment (task).
 * 
 * Supports partial updates (all fields are optional except `id`).
 * 
 * The `updateInternal` service handles:
 * 1. Verifying the task exists.
 * 2. Ensuring the user has permission to update it (assigner check).
 * 3. Validating new values if provided.
 * 4. Conflict detection if recurrence is changed.
 * 5. Regenerating instances if scheduling details change.
 */
export default authedMutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(visibilityEnum),
    recurrence: v.optional(RecurrenceSchema),
    conditions: v.optional(ConditionsSchema),
    config: v.optional(ConfigSchema),
    penalty: v.optional(PenaltySchema),
    penalty_waiver: v.optional(PenaltyWaiverSchema),
  },
  handler: async (ctx, args) => {
    // Identity is guaranteed by middleware
    const { user } = ctx;

    try {
      // Delegate update logic to core service
      await updateInternal(ctx, {
        ...args,
        user_id: user._id,
      });

      // Fetch the generated 365 instances directly from the backend to send as the identical source of truth
      const instances = await ctx.db
        .query("taskInstances")
        .withIndex("by_task", (q) => q.eq("task_id", args.id))
        .collect();

      return { success: true, instances };
    } catch (e: any) {
      // Standardized Error Response DesignPattern:
      // Catches throws from the service layer (like [SCHEDULE_CONFLICT])
      // and returns them as a structured error object.
      
      const message = e.message || "Unknown error";
      const codeMatch = message.match(/^\[(.*?)\] (.*)/);
      const code = codeMatch ? codeMatch[1] : "UNKNOWN";
      const msg = codeMatch ? codeMatch[2] : message;
      
      return { success: false, error: { code, message: msg } };
    }
  },
});
