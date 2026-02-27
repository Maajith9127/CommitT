import { v } from "convex/values";
import { authedMutation } from "../../middleware";
import { Id, Doc } from "../../_generated/dataModel";
import { Instances } from "../../core/instances/service";

/**
 * Manually create a single task instance.
 * Useful for one-off sessions that don't fit the recurrence pattern.
 */
export default authedMutation({
  args: {
    task_id: v.id("tasks"),
    start: v.number(),
    end: v.number(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;
    
    // 1. Verify task ownership/existence
    const task = (await ctx.db.get(args.task_id)) as Doc<"tasks"> | null;
    if (!task) {
      throw new Error("[TASK_NOT_FOUND] Task not found");
    }

    if (task.assignee_id !== user.id) {
       // Only assignee can add extra sessions? Or assigner? 
       // For now, let's say the assignee can manage their own schedule.
       if (task.assigner_id !== user.id) {
         throw new Error("[UNAUTHORIZED] Permission denied");
       }
    }

    // 2. Create the instance
    const instanceId = await Instances.createOne(ctx, {
      task_id: args.task_id,
      assignee_id: task.assignee_id,
      start: args.start,
      end: args.end,
      title: args.title ?? task.title,
      description: args.description ?? task.description,
      recurrence: task.recurrence, // Inherit rules even if one-off
      conditions: task.conditions,
      config: task.config,
      status: "pending",
    });

    return { instanceId };
  },
});
