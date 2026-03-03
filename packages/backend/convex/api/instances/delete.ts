import { v } from "convex/values";
import { authedMutation } from "../../middleware";
import { Doc } from "../../_generated/dataModel";
import { Instances } from "../../core/instances/service";
import { syncTaskSchedule } from "../../execution/scheduling/scheduler";

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

    const taskId = instance.task_id;
    await Instances.delete(ctx, args.id);

    // CRITICAL: Synchronize the schedule brain
    // This ensures if we move or delete an instance, the system automatically 
    // re-evaluates which alarm should be set next.
    await syncTaskSchedule(ctx, taskId);

    return { success: true };
  },
});
