import { v } from "convex/values";

import { removeInternal } from "../../core/commitments/service";

import { authedMutation } from "../../middleware";

export default authedMutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const { user } = ctx;

    await removeInternal(ctx, {
      id: args.id,
      user_id: user._id,
    });
    
    return { success: true };
  },
});
