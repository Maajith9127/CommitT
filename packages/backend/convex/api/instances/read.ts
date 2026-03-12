import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";
import { authedQuery } from "../../middleware";

/**
 * Retrieves a single task instance (Internal use only).
 */
export const getInstance = internalQuery({
  args: { instanceId: v.id("taskInstances") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.instanceId);
  },
});

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
/**
 * next(): Retrieve the single most immediate upcoming task instance.
 * 
 * DESIGN PHILOSOPHY:
 * 1. Server-Authoritative: Logic for what counts as "Next" lives here, not on the phone.
 * 2. O(1) Performance: Uses the compound index `by_assignee_start`. Regardless of 
 *    user history or future scope, the DB jumps straight to the current timestamp.
 * 3. Lifecycle Aware: Automatically skips terminal states (proceeded/failed) and 
 *    expires instances the moment their 'end' time passes.
 */
export const next = authedQuery({
  args: {},
  handler: async (ctx) => {
    const { user } = ctx;
    const now = Date.now();

    // PERFORMANCE: We query using the assignee + start time index.
    // Resulting scan is extremely fast as it starts at 'now - 1hr' (buffer).
    return await ctx.db
      .query("taskInstances")
      .withIndex("by_assignee_start", (q) =>
        q.eq("assignee_id", user._id).gte("start", now - 3600000)
      )
      .filter((q) =>
        q.and(
          // 1. Skip instances where the window is finished (expired)
          q.gt(q.field("end"), now),
          // 2. Skip terminal 'Success' or 'Terminal Failure' states
          q.neq(q.field("status"), "proceeded"),
          q.neq(q.field("status"), "failed"),
          q.neq(q.field("status"), "penalized"),
          q.neq(q.field("status"), "waived")
        )
      )
      .first(); // Finish immediately after the first match
  },
});
