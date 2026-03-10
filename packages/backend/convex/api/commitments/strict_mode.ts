import { v } from "convex/values";
import { authedMutation } from "../../middleware";
import { activateStrictModeInternal } from "../../core/commitments/service";

/**
 * Activates Strict Mode (The Steel Vault) for a specific commitment.
 * 
 * This mutation surrenders the user's right to edit or delete the task
 * and its upcoming occurrences for a defined duration.
 */
export default authedMutation({
  args: {
    id: v.id("tasks"),
    durationDays: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;

    try {
      const result = await activateStrictModeInternal(ctx, {
        id: args.id,
        user_id: user._id,
        durationDays: args.durationDays,
      });

      return result;
    } catch (e: any) {
      console.error("[API:strict_mode] Activation failed:", e.message);
      
      const message = e.message || "Unknown error";
      const codeMatch = message.match(/^\[(.*?)\] (.*)/);
      const code = codeMatch ? codeMatch[1] : "UNKNOWN";
      const msg = codeMatch ? codeMatch[2] : message;
      
      return { success: false, error: { code, message: msg } };
    }
  },
});
