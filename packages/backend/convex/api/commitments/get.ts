import { v } from "convex/values";

import { getInternal } from "../../core/commitments/queries";

import { authedQuery } from "../../middleware";

export default authedQuery({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await getInternal(ctx, { id: args.id });
  },
});
