import { QueryCtx } from "../../_generated/server";

/**
 * Lists all tasks in the system.
 * WARNING: Unbounded query.
 */
export async function listInternal(ctx: QueryCtx) {
  return await ctx.db.query("tasks").collect();
}

/**
 * Retrieves a single task ID.
 */
export async function getInternal(ctx: QueryCtx, args: { id: any }) {
  return await ctx.db.get(args.id);
}

/**
 * Lists tasks assigned to a specific assignee ID.
 * Returns all tasks for that user.
 */
export async function listByAssigneeInternal(ctx: QueryCtx, args: { assignee_id: string }) {
  return await ctx.db
    .query("tasks")
    .withIndex("by_assignee_id", (q: any) => q.eq("assignee_id", args.assignee_id))
    .collect();
}
