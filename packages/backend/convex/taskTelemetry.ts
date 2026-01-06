import { v } from "convex/values";
import { mutation} from "./_generated/server";

export const log = mutation({
  args: {
    task_id: v.id("tasks"),
    assignee_id: v.string(),
    metric_key: v.string(),
    component: v.optional(v.string()),
    value: v.any(),
    recorded_at: v.number(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.task_id);
    if (!task) {
      throw new Error("Task not found");
    }

    return await ctx.db.insert("taskTelemetry", args);
  },
});
