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
export async function execute(instance: Doc<"taskInstances">): Promise<PenaltyResult> {
  const { penalty } = instance;

  if (penalty?.type !== "send_email") {
    console.error(`[EXECUTOR:send_email] CRITICAL: Invalid penalty type for this executor: ${penalty?.type}`);
    return { success: false, error: "INVALID_TYPE" };
  }

  const { recipients, message } = penalty.config as any;

  console.log("─────────────────────────────────────────────────────────────────────────────");
  console.log("🔥 [PENALTY EXECUTED] Shame Email Blast sent!");
  console.log(`📍 Task: ${instance.title}`);
  console.log(`📧 Recipients: ${Array.isArray(recipients) ? recipients.join(", ") : recipients}`);
  console.log(`📝 Message: ${message}`);
  console.log("─────────────────────────────────────────────────────────────────────────────");

  // TODO: Implement actual email sending logic (e.g., using Resend, SendGrid, etc.)
  return { success: true, error: undefined };
}
