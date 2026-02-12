import { v } from "convex/values";
import { authedMutation } from "../../middleware";
import { Id, Doc } from "../../_generated/dataModel";

/**
 * Update an existing task instance.
 * Allows updating status (e.g. "completed", "skipped") or other mutable fields.
 */
export default authedMutation({
  args: {
    id: v.id("taskInstances"),
    status: v.optional(v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"), v.literal("skipped"))),
    // Add other updateable fields here as needed
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const { user } = ctx;

    const instance = (await ctx.db.get(id)) as Doc<"taskInstances"> | null;
    if (!instance) {
      throw new Error("[INSTANCE_NOT_FOUND] Instance not found");
    }

    if (instance.assignee_id !== user._id) {
      throw new Error("[UNAUTHORIZED] You can only update your own instances");
    }

    await ctx.db.patch(id, {
      ...updates,
      // You might want to track updated_at time here if needed
    });

    return { success: true };
  },
});
