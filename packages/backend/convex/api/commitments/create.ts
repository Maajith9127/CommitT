import { v } from "convex/values";

import { visibilityEnum } from "../../config/enums";
import { RecurrenceSchema, ConditionsSchema, ConfigSchema, PenaltySchema, PenaltyWaiverSchema } from "../../lib/validators";
import { createInternal } from "../../core/commitments/service";

import { authedMutation } from "../../middleware";

/**
 * Creates a new commitment (task) for the authenticated user.
 * 
 * This mutation handles the API layer responsibilities:
 * 1. Validating the input arguments using Convex schemas.
 * 2. Authenticating the user via middleware.
 * 3. Delegating the business logic to `createInternal` service.
 * 4. Formatting any errors into a standardized response for the client.
 * 
 * PENALTY & WAIVER:
 * Both are optional. When provided, they define the accountability contract:
 *   • penalty:        What happens when the user fails (photo blast, money loss, etc.)
 *   • penalty_waiver: How the user can EARN forgiveness after failing (captcha, paragraph, etc.)
 * These are stored on the task as master rules, then SNAPSHOTTED onto every
 * generated instance to prevent retroactive manipulation.
 */
export default authedMutation({
  args: {
    assignee_id: v.string(),
    title: v.string(),
    description: v.string(),
    visibility: visibilityEnum,
    recurrence: RecurrenceSchema,
    conditions: ConditionsSchema,
    config: ConfigSchema,
    // ── Optional Accountability Contract ──
    // Omitted = no penalty/waiver for this commitment.
    penalty: v.optional(PenaltySchema),
    penalty_waiver: v.optional(PenaltyWaiverSchema),
  },
  handler: async (ctx, args) => {
    // Identity is guaranteed by the `authedMutation` middleware.
    const { user } = ctx;

    console.log("[API:create] Received create request with args:", JSON.stringify(args, null, 2));
    console.log("[API:create] Authenticated user:", user._id);
    
    try {
      // Delegate the creation logic to the core service layer.
      // This separates the API interface from the domain logic.
      const result = await createInternal(ctx, {
        ...args,
        assigner_id: user._id,
      });

      // Fetch the generated 365 instances directly from the backend to send as the identical source of truth
      const instances = await ctx.db
        .query("taskInstances")
        .withIndex("by_task", (q) => q.eq("task_id", result.taskId))
        .collect();

      return { success: true, taskId: result.taskId, instances };
    } catch (e: any) {
      // Graceful Error Handling:
      // Instead of throwing a raw Convex error, we catch it and return a structured object.
      // This allows the UI to handle specific error codes (e.g., displaying a specific toast for conflicts)
      // rather than a generic opaque error.
      
      const message = e.message || "Unknown error";
      
      // Parse our structured error format: "[CODE] Message"
      const codeMatch = message.match(/^\[(.*?)\] (.*)/);
      const code = codeMatch ? codeMatch[1] : "UNKNOWN";
      const msg = codeMatch ? codeMatch[2] : message;
      
      return { success: false, error: { code, message: msg } };
    }
  },
});
