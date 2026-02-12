import { v } from "convex/values";

import { listByAssigneeInternal } from "../../core/commitments/queries";

import { authedQuery } from "../../middleware";

/**
 * Lists commitments assigned to a specific user.
 * 
 * If `assignee_id` is provided, lists tasks for that user.
 * If not provided, defaults to the authenticated user's ID.
 * 
 * Note: This query is authenticated, but currently allows viewing any user's tasks 
 * if their ID is known (or at least queries for them). 
 * Authorization logic should be verified in the core layer if cross-user viewing is restricted.
 */
export const byAssignee = authedQuery({
  args: { assignee_id: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = ctx;
     // Default to current user if no specific assignee is requested
     const targetId = args.assignee_id || user.id;
    
    return await listByAssigneeInternal(ctx, { assignee_id: targetId });
  },
});

/**
 * Default query: Lists all commitments assigned to the currently authenticated user.
 * 
 * This is a convenience wrapper around `listByAssigneeInternal` 
 * specifically for "my tasks".
 */
export default authedQuery({
  args: {},
  handler: async (ctx) => {
     const { user } = ctx;
     // Strictly force the assignee to be the authenticated user
     return await listByAssigneeInternal(ctx, { assignee_id: user.id });
  }
});
