import { Doc } from "../../../_generated/dataModel";
import { PenaltyResult } from "../dispatcher";

/**
 * embarrassing_photo.ts
 * 
 * EXECUTOR: Embarrassing Photo Penalty
 * ─────────────────────────────────────────────────────────────────────────────
 * This executor handles the "Ultimate Forfeit". If the user fails, their
 * embarrassing photo is blasted to their configured recipients.
 */
export async function execute(ctx: any, instance: Doc<"taskInstances">): Promise<PenaltyResult> {
  const { penalty } = instance;

  if (penalty?.type !== "embarrassing_photo") {
    console.error(`[EXECUTOR:embarrassing_photo] CRITICAL: Invalid penalty type: ${penalty?.type}`);
    return { success: false, error: "INVALID_TYPE" };
  }

  const config = penalty.config as any;
  const { channel, storageId, emailTo, emailSubject, emailBody } = config;

  if (channel !== "email") {
    console.log(`[EXECUTOR:embarrassing_photo] Channel '${channel}' not yet supported. Logging only.`);
    return { success: true }; 
  }

  if (!emailTo) {
    console.error(`[EXECUTOR:embarrassing_photo] No recipient email found`);
    return { success: false, error: "MISSING_RECIPIENT" };
  }

  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }

    // 1. Resolve the public URL for the embarrassing photo
    let photoUrl = config.photoUrl; // Fallback to provided URL
    if (storageId) {
      const liveUrl = await ctx.storage.getUrl(storageId);
      if (liveUrl) {
        photoUrl = liveUrl;
        console.log(`[EXECUTOR:embarrassing_photo] Resolved live storage URL: ${photoUrl}`);
      }
    }

    // 2. Blast the email via Resend
    const toArray = Array.isArray(emailTo) ? emailTo : [emailTo];

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "CommitT <noreply@hey-jarvis-accountability.store>",
        to: toArray,
        subject: emailSubject || `I failed my commitment...`,
        text: `Hey,\n\nI committed to a task ("${instance.title}") but I completely failed to follow through.\n\nHere is a message I left for you: "${emailBody || "I failed my commitment."}"\n\nView my embarrassing photo here: ${photoUrl}\n\n- Sent automatically via CommitT`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #111827; line-height: 1.6;">
            <p style="font-size: 16px;">Hey there,</p>
            
            <p style="font-size: 16px;">
              I committed to a task called <strong>"${instance.title}"</strong>, but I completely failed to follow through.
            </p>
            
            <p style="font-size: 16px;">As my accountability partner, here is a message I left for you:</p>
            
            <blockquote style="margin: 0 0 24px 0; padding: 12px 16px; border-left: 4px solid #3B82F6; background-color: #F3F4F6; font-size: 16px; font-style: italic; color: #4B5563;">
              "${emailBody || "I failed my commitment."}"
            </blockquote>

            <p style="font-size: 16px;">And as promised, here is my embarrassing photo forfeit:</p>
            
            ${photoUrl ? `
              <div style="margin: 20px 0;">
                <img src="${photoUrl}" alt="My Forfeit Photo" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #E5E7EB;" />
              </div>
            ` : `
              <p style="font-style: italic; color: #6B7280;">(No photo was attached to this task)</p>
            `}
            
            <p style="margin-top: 32px; font-size: 14px; color: #6B7280;">
              — Sent automatically on my behalf via the CommitT app.
            </p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Resend Error: ${JSON.stringify(errorData)}`);
    }

    console.log(`[EXECUTOR:embarrassing_photo] Evidence blasted successfully to ${emailTo}`);
    return { success: true };

  } catch (error: any) {
    console.error(`[EXECUTOR:embarrassing_photo] FAILED:`, error.message);
    return { success: false, error: error.message };
  }
}
