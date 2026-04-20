import type { TaskDraft } from "@/stores/useTaskDraftStore";

// ─────────────────────────────────────────────────────────────────────────────
// Display Helpers — Penalty & Waiver Card Metadata
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EXTRACTION RATIONALE:
 * These were two large IIFEs inlined inside the JSX return block of FinalScreen.
 * They are pure functions of the draft — zero side-effects — making them ideal
 * candidates for extraction. The component now calls these helpers and spreads
 * the result directly onto <ConditionCard />.
 */

interface CardDisplay {
  title: string;
  subtitle: string;
  icon: string;
}

/**
 * Resolves the visual metadata (icon, title, subtitle) for the Penalty ConditionCard
 * based on the currently selected penalty type in the draft.
 */
export function getPenaltyDisplay(draft: TaskDraft): CardDisplay {
  const penalty = draft.penalty;
  const config = penalty?.config;

  let title = "Add Penalty";
  let subtitle = "Set a consequence for failing your commitment";
  let icon = "alert-circle-outline";

  if (penalty?.type === "send_money") {
    title = "Money Penalty";
    subtitle = `₹${config?.amount || 500} will be deducted if you fail`;
    icon = "currency-inr";
  } else if (penalty?.type === "embarrassing_photo") {
    title = "Embarrassing Photo";
    subtitle = `Will be sent via ${config?.channel || "delivery channel"} to your chosen mail id `;
    icon = "camera-enhance-outline";
  } else if (penalty?.type === "send_email") {
    title = "Shame Email";
    subtitle = "Automated email will be sent to your recipients";
    icon = "email-outline";
  } else if (penalty?.type === "commit_direct") {
    title = "Direct Accountability";
    subtitle = "Consequence sent directly to your partner";
    icon = "account-arrow-right-outline";
  }

  return { title, subtitle, icon };
}

/**
 * Resolves the visual metadata (icon, title, subtitle) for the Waiver ConditionCard
 * based on the currently selected waiver type in the draft.
 */
export function getWaiverDisplay(draft: TaskDraft): CardDisplay {
  const waiver = draft.penalty_waiver;
  const config = waiver?.config;

  let title = "Choose a Penalty Waiver";
  let subtitle = "Set a challenge to waive your consequence";
  let icon = "check-decagram-outline";

  if (waiver?.type === "captcha") {
    title = "Solve CAPTCHAs";
    subtitle = `Solve ${config?.count || 5} ${config?.difficulty || "medium"} noise captchas to waive off the penalty `;
    icon = "shield-check-outline";
  } else if (waiver?.type === "paragraph") {
    title = "Write Paragraph";
    subtitle = "Type the chosen text to earn a waiver";
    icon = "pencil-outline";
  } else if (waiver?.type === "intense") {
    title = "Redo With Intensity";
    subtitle = "Repeat the habit with increased difficulty";
    icon = "fire";
  } else if (waiver?.type === "run") {
    title = "Run 5 KM";
    subtitle = "Complete the workout to waive penalty";
    icon = "run-fast";
  }

  return { title, subtitle, icon };
}
