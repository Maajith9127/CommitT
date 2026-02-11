import { QueryCtx } from "../../_generated/server";

/**
 * Fetch all task instances for a given assignee.
 * Since all instances are pre-materialized, this is a simple index query.
 */
export async function listInstancesByAssigneeInternal(
  ctx: QueryCtx,
  args: { assignee_id: string }
) {
  return await ctx.db
    .query("taskInstances")
    .withIndex("by_assignee", (q: any) => q.eq("assignee_id", args.assignee_id))
    .collect();
}
