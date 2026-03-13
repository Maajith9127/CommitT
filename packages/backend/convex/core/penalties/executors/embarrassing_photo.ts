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
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY is not set");
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

    // 2. Blast the email via Brevo
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: { 
          name: "CommitT System", 
          email: "maajithanas@gmail.com" // This must be the email you used to sign up for Brevo
        },
        to: Array.isArray(emailTo) 
          ? emailTo.map((email: string) => ({ email })) 
          : [{ email: emailTo }],
        subject: emailSubject || `⚠️ ACCOUNTABILITY REPORT: Commitment Breach by Maajith`,
        htmlContent: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; color: #333; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #FF3B30; padding-bottom: 10px;">
              <h1 style="color: #FF3B30; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">Accountability Breach</h1>
              <p style="color: #666; font-size: 14px; margin-top: 5px;">Case ID: ${instance._id.substring(0, 8)} | Terminal Consequence</p>
            </div>
            
            <p style="font-size: 16px;">This notice is to inform you that a commitment has been failed. Per the pre-arranged accountability contract, the following consequence has been automatically triggered.</p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #FF3B30; margin: 25px 0;">
              <p style="margin: 0; font-size: 14px; color: #666; text-transform: uppercase; font-weight: bold;">Commitment Header:</p>
              <h3 style="margin: 5px 0 15px 0; font-size: 20px;">${instance.title}</h3>
              
              <p style="margin: 0; font-size: 14px; color: #666; text-transform: uppercase; font-weight: bold;">Shame Message:</p>
              <p style="margin: 5px 0; font-size: 18px; color: #333; font-style: italic; background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #eee;">
                "${emailBody || "I failed to keep my word and accept this consequence."}"
              </p>
            </div>

            <p style="font-weight: bold; margin-bottom: 15px;">Evidence Attachment:</p>
            <div style="text-align: center; background: #000; padding: 10px; border-radius: 8px;">
              ${photoUrl ? `
                <img src="${photoUrl}" alt="Evidence" style="max-width: 100%; border-radius: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);" />
              ` : `
                <p style="color: #fff; font-style: italic;">No photo evidence was attached to this contract.</p>
              `}
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
              <p>This email was automatically generated and sent by the CommitT Accountability Protocol.</p>
              <p>The participant agreed to these terms prior to the execution window. No manual intervention possible.</p>
            </div>
          </div>
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Brevo Error: ${JSON.stringify(errorData)}`);
    }

    console.log(`[EXECUTOR:embarrassing_photo] Evidence blasted successfully to ${emailTo}`);
    return { success: true };

  } catch (error: any) {
    console.error(`[EXECUTOR:embarrassing_photo] FAILED:`, error.message);
    return { success: false, error: error.message };
  }
}
