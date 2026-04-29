import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { authedAction } from "../../middleware";

/**
 * test_email.ts
 * 
 * NOTIFICATIONS: Test Email Sender
 * ─────────────────────────────────────────────────────────────────────────────
 * This action allows the UI to dispatch a real-world test email payload via
 * the Resend API to verify deliverability and inbox placement before arming
 * the actual penalty executor.
 * 
 * ARCHITECTURE DEBT / REFACTOR TARGET:
 * Currently, the raw Resend API `fetch` logic is baked directly into this API 
 * layer. As the notification system scales, this email dispatch logic MUST be 
 * extracted into a dedicated core service layer (e.g., `core/notifications/dispatcher.ts`) 
 * to maintain strict separation of concerns between API endpoints and domain logic.
 */
export const sendTestEmail = authedAction({
  args: {
    emailTo: v.string(),
  },
  handler: async (ctx, args) => {
    const { emailTo } = args;
    const { user } = ctx;

    try {
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (!RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not set in environment variables");
      }

      console.log(`[TEST_EMAIL] Preparing test payload for: ${emailTo} by user ${user._id}`);

      // 1. Construct exact payload as per spec
      const emailPayload: any = {
        from: "Maajith <noreply@hey-jarvis-accountability.store>",
        to: emailTo,
        subject: "beta test",
        text: "test message",
      };

      // 2. Blast the test email via Resend
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[TEST_EMAIL] Resend API rejected payload:`, errorData);
        throw new Error(`Resend Error: ${JSON.stringify(errorData)}`);
      }

      console.log(`[TEST_EMAIL] Test email blasted successfully to ${emailTo}`);

      // ** AUDIT LOG: Record specific blast success **
      await ctx.runMutation(internal.api.logs.mutations.createAuditLog, {
        userId: user._id,
        event_type: "penalty_executed",
        message: `Test email sent to ${emailTo}`,
        metadata: {
          recipient: emailTo,
          timestamp: Date.now(),
          timestamp_readable: new Date().toISOString(),
          is_test_run: true
        }
      });

      return { success: true };
    } catch (error: any) {
      console.error(`[TEST_EMAIL] Failed to send test email:`, error);
      
      // ** AUDIT LOG: Record test email failure **
      await ctx.runMutation(internal.api.logs.mutations.createAuditLog, {
        userId: user._id,
        event_type: "penalty_failed",
        message: `Failed to send test email to ${emailTo}`,
        metadata: {
          recipient: emailTo,
          error_message: error.message,
          timestamp: Date.now(),
          timestamp_readable: new Date().toISOString(),
          is_test_run: true
        }
      });

      return { success: false, error: error.message };
    }
  }
});
