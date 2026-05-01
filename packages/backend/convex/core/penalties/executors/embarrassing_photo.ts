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
    console.log(`[EXECUTOR:embarrassing_photo] Raw config.emailTo:`, emailTo);
    
    let toArray: string[] = [];
    if (Array.isArray(emailTo)) {
      toArray = emailTo;
    } else if (typeof emailTo === "string") {
      // Split by comma or whitespace and clean up (handles "mail1@test.com, mail2@test.com")
      toArray = emailTo.split(/[,\s]+/).map(e => e.trim()).filter(e => e.length > 0);
    } else if (emailTo) {
      toArray = [String(emailTo)];
    }

    console.log(`[EXECUTOR:embarrassing_photo] Final recipient array for Resend:`, toArray);

    if (toArray.length === 0) {
      throw new Error("Recipient list (toArray) resulted in 0 valid email addresses.");
    }

    const emailPayload: any = {
      from: `CommitT Accountability <noreply@hey-jarvis-accountability.store>`,
      to: toArray,
      subject: emailSubject || `Formal Notification: Missed Commitment Protocol`,
      text: `Formal Accountability Notification\n\nThis is a formal notification regarding a commitment made by the user through the CommitT platform.\n\nThe following task was not completed as scheduled: "${instance.title}"\n\nAs part of the user's pre-configured accountability protocol, they have requested that this message be delivered to you:\n\n"${emailBody || "The scheduled commitment was not fulfilled."}"\n\nA photographic record associated with this forfeit has been included as an attachment to this email for your verification.\n\nThis notification was generated automatically by the CommitT accountability enforcement system.`,
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937; line-height: 1.7; border: 1px solid #e5e7eb; padding: 40px; border-radius: 8px;">
          <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 24px; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
            Accountability Notification
          </h2>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            This communication serves as a formal record of a missed commitment for the following task:
          </p>
          
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin-bottom: 24px; border-left: 4px solid #9ca3af;">
            <strong style="color: #111827; display: block; margin-bottom: 4px;">Task Identifier:</strong>
            <span style="font-size: 16px; color: #374151;">${instance.title}</span>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 12px;">
            In accordance with the user's accountability settings, the following statement has been issued for your review:
          </p>
          
          <div style="margin: 0 0 32px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px; font-size: 16px; color: #1f2937; border: 1px solid #d1d5db;">
            "${emailBody || "The scheduled commitment was not fulfilled."}"
          </div>

          <p style="font-size: 16px; margin-bottom: 12px;">
            A photographic forfeit associated with this failure has been processed and is displayed below for your verification:
          </p>

          <div style="margin-bottom: 32px; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; background-color: #f9fafb;">
            <img src="${photoUrl}" alt="Accountability Evidence" style="width: 100%; height: auto; display: block;" />
          </div>
          
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          
          <div style="text-align: center;">
            <p style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
              This is an automated transmission from the CommitT Accountability System.
            </p>
            <p style="font-size: 11px; color: #9ca3af; font-family: monospace;">
              Reference ID: ${instance._id} | Issued: ${new Date().toISOString()}
            </p>
          </div>
        </div>
      `
    };

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