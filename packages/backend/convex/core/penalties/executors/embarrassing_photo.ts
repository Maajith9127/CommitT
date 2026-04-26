import { Doc } from "../../../_generated/dataModel";
import { internal } from "../../../_generated/api";
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
    // ** AUDIT LOG: Record penalty failure (Invalid Type) **
    await ctx.runMutation(internal.api.logs.mutations.createAuditLog, {
      userId: instance.assignee_id,
      taskId: instance.task_id,
      instanceId: instance._id,
      event_type: "penalty_failed",
      message: `Failed to execute penalty for task: ${instance.title} (Invalid config type)`,
      metadata: {
        task_title: instance.title,
        error_message: `Invalid penalty type: ${penalty?.type}`,
        timestamp: Date.now(),
        timestamp_readable: new Date().toISOString(),
      }
    });
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
    // ** AUDIT LOG: Record penalty failure (Missing config) **
    await ctx.runMutation(internal.api.logs.mutations.createAuditLog, {
      userId: instance.assignee_id,
      taskId: instance.task_id,
      instanceId: instance._id,
      event_type: "penalty_failed",
      message: `Failed to execute penalty for task: ${instance.title} (Missing Recipient)`,
      metadata: {
        task_title: instance.title,
        error_message: "Missing configured recipient email.",
        timestamp: Date.now(),
        timestamp_readable: new Date().toISOString(),
        penalty_type: penalty?.type,
      }
    });
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
        subject: emailSubject || "Hey, check this out",
        text: `Hey!\n\nHope you've been doing well. Just wanted to drop a quick note and share this with you.\n\n${emailBody ? `${emailBody}\n\n` : ""}Here is the picture: ${photoUrl}\n\nCatch up soon!`,
        html: `
          <div style="font-family: Arial, sans-serif; font-size: 15px; color: #222; max-width: 600px;">
            <p>Hey!</p>
            
            <p>Hope you've been doing well. Just wanted to drop a quick note and share this with you.</p>
            
            ${emailBody ? `
            <p style="margin: 15px 0; color: #444;">
              ${emailBody}
            </p>
            ` : ""}

            <p>Here is the picture:</p>
            
            ${photoUrl ? `
              <div style="margin: 20px 0;">
                <img src="${photoUrl}" alt="Attached Photo" style="max-width: 100%; height: auto; border-radius: 4px;" />
              </div>
            ` : `
              <p style="color: #888;">(No photo attached)</p>
            `}
            
            <p>Catch up soon!</p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Resend Error: ${JSON.stringify(errorData)}`);
    }

    console.log(`[EXECUTOR:embarrassing_photo] Evidence blasted successfully to ${emailTo}`);
    
    // ** AUDIT LOG: Record specific blast success **
    await ctx.runMutation(internal.api.logs.mutations.createAuditLog, {
      userId: instance.assignee_id,
      taskId: instance.task_id,
      instanceId: instance._id,
      event_type: "penalty_executed",
      message: `Embarrassing photo penalty executed. Evidence blasted to ${emailTo}`,
      metadata: {
        task_title: instance.title,
        recipient: emailTo,
        timestamp: Date.now(),
        timestamp_readable: new Date().toISOString(),
        penalty_type: penalty?.type,
      }
    });

    return { success: true };

  } catch (error: any) {
    console.error(`[EXECUTOR:embarrassing_photo] FAILED:`, error.message);
    
    // ** AUDIT LOG: Record penalty failure (API or external error) **
    await ctx.runMutation(internal.api.logs.mutations.createAuditLog, {
      userId: instance.assignee_id,
      taskId: instance.task_id,
      instanceId: instance._id,
      event_type: "penalty_failed",
      message: `Failed to execute penalty for task: ${instance.title} (Execution Error)`,
      metadata: {
        task_title: instance.title,
        error_message: error.message,
        timestamp: Date.now(),
        timestamp_readable: new Date().toISOString(),
        penalty_type: penalty?.type,
      }
    });

    return { success: false, error: error.message };
  }
}
