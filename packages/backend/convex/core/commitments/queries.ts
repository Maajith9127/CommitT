import { QueryCtx } from "../../_generated/server";

export async function listInternal(ctx: QueryCtx) {
  return await ctx.db.query("tasks").collect();
}

export async function getInternal(ctx: QueryCtx, args: { id: any }) {
  return await ctx.db.get(args.id);
}

export async function listByAssigneeInternal(ctx: QueryCtx, args: { assignee_id: string }) {
  return await ctx.db
    .query("tasks")
    .withIndex("by_assignee_id", (q: any) => q.eq("assignee_id", args.assignee_id))
    .collect();
}
