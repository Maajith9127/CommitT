import { v } from "convex/values";
import { authedMutation } from "../../middleware";
import { Doc } from "../../_generated/dataModel";

/**
 * Delete a specific task instance.
 * Usually users should mark as "skipped" instead, but deletion is sometimes needed forcleanup.
 */
export default authedMutation({
  args: {
    id: v.id("taskInstances"),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;
    const instance = (await ctx.db.get(args.id)) as Doc<"taskInstances"> | null;

    if (!instance) {
      // If already deleted, just return success
      return { success: true };
    }

    if (instance.assignee_id !== user._id) {
      throw new Error("[UNAUTHORIZED] You can only delete your own instances");
    }

    // Cancel any scheduled jobs associated with this instance
    if (instance.scheduled_job_id) {
      await ctx.scheduler.cancel(instance.scheduled_job_id);
    }


    await ctx.db.delete(args.id);

    return { success: true };
  },
});
