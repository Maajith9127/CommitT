import { v } from "convex/values";

import { removeInternal } from "../../core/commitments/service";

import { authedMutation } from "../../middleware";

/**
 * Deletes a commitment (task) by its ID.
 * 
 * This mutation:
 * 1. Accepts a task ID.
 * 2. Verifies the user is authenticated via middleware.
 * 3. Calls `removeInternal` which handles the business logic of:
 *    - Checking ownership (only the assigner can delete).
 *    - Cleaning up future instances.
 *    - Removing the task record itself.
 */
export default authedMutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const { user } = ctx;

    // Delegate deletion logic to the core service.
    // The service layer will enforce that `user._id` matches the task's assigner.
    await removeInternal(ctx, {
      id: args.id,
      user_id: user._id,
    });
    
    return { success: true };
  },
});
