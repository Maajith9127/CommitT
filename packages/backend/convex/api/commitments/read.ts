import { v } from "convex/values";
import { authedQuery } from "../../middleware";

/**
 * Retrieves a single commitment (task) by its ID.
 * 
 * This query:
 * 1. Ensures the user is authenticated.
 * 2. Fetches the task document directly from the database.
 * 3. Returns a single task object or null/undefined if not found.
 */
export const get = authedQuery({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Lists commitments assigned to a specific user.
 * 
 * If `assignee_id` is provided, lists tasks for that user.
 * If not provided, defaults to the authenticated user's ID.
 * 
 * Note: This query is authenticated, but currently allows viewing any user's tasks 
 * if their ID is known (or at least queries for them). 
 */
export const byAssignee = authedQuery({
  args: { assignee_id: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = ctx;
     // Default to current user if no specific assignee is requested
     const targetId = args.assignee_id || user.id;
    
    return await ctx.db
      .query("tasks")
      .withIndex("by_assignee_id", (q) => q.eq("assignee_id", targetId))
      .collect();
  },
});

/**
 * Default query: Lists all commitments assigned to the currently authenticated user.
 * 
 * This is a convenience wrapper specifically for "my tasks".
 */
export const list = authedQuery({
  args: {},
  handler: async (ctx) => {
     const { user } = ctx;
     // Strictly force the assignee to be the authenticated user
     return await ctx.db
      .query("tasks")
      .withIndex("by_assignee_id", (q) => q.eq("assignee_id", user.id))
      .collect();
  }
});
