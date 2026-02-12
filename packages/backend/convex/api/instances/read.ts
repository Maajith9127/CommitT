
import { v } from "convex/values";
import { authedQuery } from "../../middleware";

/**
 * Retrieves a single task instance by its ID.
 */
export const get = authedQuery({
  args: { id: v.id("taskInstances") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Lists all task instances for the authenticated user.
 */
export const list = authedQuery({
  args: {},
  handler: async (ctx) => {
    const { user } = ctx;
    return await ctx.db
      .query("taskInstances")
      .withIndex("by_assignee", (q) => q.eq("assignee_id", user.id))
      .collect();
  },
});

/**
 * Lists task instances within a specific date range.
 * Efficiently uses the `by_assignee_start` compound index.
 */
export const byRange = authedQuery({
  args: {
    rangeStart: v.number(),
    rangeEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;
    // console.log(`[byRange] user: ${user._id}, range: ${new Date(args.rangeStart).toISOString()} - ${new Date(args.rangeEnd).toISOString()}`);
    
    return await ctx.db
      .query("taskInstances")
      .withIndex("by_assignee_start", (q) =>
        q.eq("assignee_id", user._id).gte("start", args.rangeStart).lte("start", args.rangeEnd)
      )
      .collect();
  },
});
