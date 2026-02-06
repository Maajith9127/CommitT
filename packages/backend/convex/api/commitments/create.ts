import { v } from "convex/values";

import { visibilityEnum } from "../../config/enums";
import { RecurrenceSchema, ConditionsSchema } from "../../lib/validators";
import { createInternal } from "../../core/commitments/service";

import { authedMutation } from "../../middleware";

export default authedMutation({
  args: {
    assignee_id: v.string(),
    title: v.string(),
    description: v.string(),
    visibility: visibilityEnum,
    recurrence: RecurrenceSchema,
    conditions: ConditionsSchema,
  },
  handler: async (ctx, args) => {
    // Identity is now guaranteed by middleware
    const { user } = ctx;
    

    try {
      // Call Core Logic
      const result = await createInternal(ctx, {
        ...args,
        assigner_id: user._id,
      });
      return { success: true, taskId: result.taskId };
    } catch (e: any) {
      // Return formatted error for UI to handle gracefully if preferred, or just throw
      // The user's code previously returned { success: false, error: ... }
      // I will allow logic errors to be returned as values for easier UI handling
      const message = e.message || "Unknown error";
      const codeMatch = message.match(/^\[(.*?)\] (.*)/);
      const code = codeMatch ? codeMatch[1] : "UNKNOWN";
      const msg = codeMatch ? codeMatch[2] : message;
      
      return { success: false, error: { code, message: msg } };
    }
  },
});
