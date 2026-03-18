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
        subject: emailSubject || `Accountability Report: Task Update for Maajith`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; line-height: 1.5;">
            <div style="padding: 20px 0; border-bottom: 1px solid #eeeeee; margin-bottom: 20px;">
              <h2 style="margin: 0; color: #2C3E50; font-size: 20px; font-weight: 600;">Accountability Report</h2>
              <p style="margin: 4px 0 0 0; color: #7F8C8D; font-size: 14px;">Reference ID: ${instance._id.substring(0, 8)}</p>
            </div>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Hello,<br><br>
              This automated notice is to inform you that a pre-scheduled commitment was not completed successfully. As part of a predefined accountability protocol, you were designated as the recipient for this notification.
            </p>
            
            <div style="background-color: #F8F9FA; padding: 20px; border-radius: 6px; margin-bottom: 24px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #7F8C8D; text-transform: uppercase; font-weight: 600;">Task Overview</p>
              <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #2C3E50; font-weight: 500;">${instance.title}</h3>
              
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #7F8C8D; text-transform: uppercase; font-weight: 600;">Participant Message</p>
              <p style="margin: 0; font-size: 16px; color: #34495E; font-style: italic; background-color: #FFFFFF; padding: 12px; border-radius: 4px; border: 1px solid #EAECEE;">
                "${emailBody || "I was unable to complete this task as committed."}"
              </p>
            </div>

            <div style="margin-bottom: 30px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #2C3E50; font-weight: 600;">Attached Document:</p>
              <div style="background-color: #F8F9FA; padding: 16px; border-radius: 6px; text-align: center;">
                ${photoUrl ? `
                  <img src="${photoUrl}" alt="Attachment" style="max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 0 auto; border: 1px solid #EAECEE;" />
                ` : `
                  <p style="margin: 0; color: #7F8C8D; font-size: 14px; font-style: italic;">No file was attached to this report.</p>
                `}
              </div>
            </div>

            <div style="border-top: 1px solid #EEEEEE; padding-top: 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #95A5A6;">
                This is an automated operational email generated by the CommitT Accountability System.<br>
                The participant explicitly authorized this transmission prior to the task window.
              </p>
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
