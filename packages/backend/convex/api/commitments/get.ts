import { v } from "convex/values";

import { getInternal } from "../../core/commitments/queries";

import { authedQuery } from "../../middleware";

/**
 * Retrieves a single commitment (task) by its ID.
 * 
 * This query:
 * 1. Ensures the user is authenticated.
 * 2. Fetches the task document from the database using `getInternal`.
 * 3. Returns a single task object or null/undefined if not found.
 */
export default authedQuery({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    // We delegate the DB read to the core query layer.
    // This maintains consistent access patterns across the application.
    return await getInternal(ctx, { id: args.id });
  },
});
