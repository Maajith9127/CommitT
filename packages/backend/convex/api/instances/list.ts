import { authedQuery } from "../../middleware";
import { v } from "convex/values";

import { listInstancesByAssigneeInternal } from "../../core/commitments/instanceQueries";

/**
 * Fetch all task instances for the current authenticated user.
 */
export default authedQuery({
  args: {},
  handler: async (ctx) => {
    const { user } = ctx;
    return await listInstancesByAssigneeInternal(ctx, { assignee_id: user._id });
  },
});

/**
 * Fetch task instances within a date range for the current user.
 * Uses the compound index by_assignee_start for efficient range queries.
 */
export const byRange = authedQuery({
  args: {
    rangeStart: v.number(),
    rangeEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;
    console.log(`[byRange] user: ${user._id}, rangeStart: ${args.rangeStart} (${new Date(args.rangeStart).toISOString()}), rangeEnd: ${args.rangeEnd} (${new Date(args.rangeEnd).toISOString()})`);
    const results = await ctx.db
      .query("taskInstances")
      .withIndex("by_assignee_start", (q: any) =>
        q.eq("assignee_id", user._id).gte("start", args.rangeStart).lte("start", args.rangeEnd)
      )
      .collect();
    console.log(`[byRange] Found ${results.length} instances`);
    return results;
  },
});
