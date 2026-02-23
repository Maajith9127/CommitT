import { v } from "convex/values";
import { authedMutation } from "../../middleware";

export default authedMutation({
  args: {
    instanceId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = ctx;
    console.log("[Verification API] Received verify request from user:", user._id);
    console.log("[Verification API] Instance ID:", args.instanceId);
    console.log("[Verification API] Message from frontend:", args.message);

    return { success: true, response: `Hello from Backend! I received your message: ${args.message}` };
  },
});
