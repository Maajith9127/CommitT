import { v } from "convex/values";

import { visibilityEnum } from "../../config/enums";
import { RecurrenceSchema, ConditionsSchema } from "../../lib/validators";
import { updateInternal } from "../../core/commitments/service";

import { authedMutation } from "../../middleware";

export default authedMutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(visibilityEnum),
    recurrence: v.optional(RecurrenceSchema),
    conditions: v.optional(ConditionsSchema),
  },
  handler: async (ctx, args) => {
    // Identity is now guaranteed by middleware
    const { user } = ctx;

    try {
      await updateInternal(ctx, {
        ...args,
        user_id: user._id,
      });
      return { success: true };
    } catch (e: any) {
      const message = e.message || "Unknown error";
      const codeMatch = message.match(/^\[(.*?)\] (.*)/);
      const code = codeMatch ? codeMatch[1] : "UNKNOWN";
      const msg = codeMatch ? codeMatch[2] : message;
      return { success: false, error: { code, message: msg } };
    }
  },
});
