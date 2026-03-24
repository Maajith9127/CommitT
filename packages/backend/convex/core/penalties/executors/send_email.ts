import { Doc } from "../../../_generated/dataModel";
import { PenaltyResult } from "../dispatcher";

/**
 * send_email.ts
 * 
 * EXECUTOR: Send Email Penalty
 * ─────────────────────────────────────────────────────────────────────────────
 * This executor is responsible for sending automated shame emails to the 
 * configured recipients if a user fails a commitment and the waiver expires.
 * 
 * For now, it's a console log skeleton as per requested.
 */
export async function execute(ctx: any, instance: Doc<"taskInstances">): Promise<PenaltyResult> {
  const { penalty } = instance;

  if (penalty?.type !== "send_email") {
    console.error(`[EXECUTOR:send_email] CRITICAL: Invalid penalty type for this executor: ${penalty?.type}`);
    return { success: false, error: "INVALID_TYPE" };
  }

  // The penalty config contains the recipients and the shaming message
  // Note: Backend stores these in penalty.config
  const { emailTo, emailSubject, emailBody } = penalty.config as any;
  const recipientEmail = emailTo || (penalty.config as any).recipients;

  if (!recipientEmail) {
    console.error(`[EXECUTOR:send_email] No recipient email found in config`);
    return { success: false, error: "MISSING_RECIPIENT" };
  }

  console.log(`[EXECUTOR:send_email] Initiating Brevo blast for Task: ${instance.title} to ${recipientEmail}`);

  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set in environment variables");
    }

    const toArray = Array.isArray(recipientEmail) ? recipientEmail : [recipientEmail];

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "CommitT Accountability <noreply@hey-jarvis-accountability.store>",
        to: toArray,
        subject: emailSubject || `[BREACH] Commitment Failed: ${instance.title}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 2px solid #FF3B30; border-radius: 10px;">
            <h2 style="color: #FF3B30;">Commitment Breach Detected</h2>
            <p>This is an automated accountability notification.</p>
            <p><strong>Task:</strong> ${instance.title}</p>
            <hr />
            <div style="background: #f8f8f8; padding: 15px; border-radius: 5px; font-style: italic;">
              "${emailBody || "I failed to complete my commitment on time."}"
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Sent via CommitT Accountability System.
            </p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Resend API returned ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log(`[EXECUTOR:send_email] Resend success! Message ID: ${result.id}`);
    return { success: true };

  } catch (error: any) {
    console.error(`[EXECUTOR:send_email] FAILED to send email:`, error.message);
    return { success: false, error: error.message };
  }
}
