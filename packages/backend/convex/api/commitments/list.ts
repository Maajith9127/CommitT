import { v } from "convex/values";

import { listByAssigneeInternal } from "../../core/commitments/queries";

import { authedQuery } from "../../middleware";

export const byAssignee = authedQuery({
  args: { assignee_id: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = ctx;
     const targetId = args.assignee_id || user.id;
    
    return await listByAssigneeInternal(ctx, { assignee_id: targetId });
  },
});

export default authedQuery({
  args: {},
  handler: async (ctx) => {
     const { user } = ctx;
     return await listByAssigneeInternal(ctx, { assignee_id: user.id });
  }
});
