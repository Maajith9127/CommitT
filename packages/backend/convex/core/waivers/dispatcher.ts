import { initializeCaptchaChallenges } from "./captcha";

/**
 * WAIVER DISPATCHER: The Central Hub
 * 
 * DESIGN RATIONALE:
 * This acts as the factory router. When armAccountabilityContract is called, 
 * it asks the dispatcher: "What challenges should I store for this waiver type?"
 * 
 * PRO-LEVEL: This decoupling means you can add new waiver types without 
 * ever touching your core execution logic in runner.ts.
 */

export async function initializeWaiverChallenges(ctx: any, instance: any) {
  const waiverConfig = instance.penalty_waiver;
  if (!waiverConfig) return [];

  // 1. ROUTE TO THE CORRECT HANDLER
  switch (waiverConfig.type) {
    case "captcha":
      // { config: { count: 5, difficulty: "medium" }, ... }
      return await initializeCaptchaChallenges(waiverConfig.config);

    case "payment":
      // Placeholder: In the future, this would call stripe to generate a session
      // return await initializePaymentChallenges(waiverConfig.config);
      return [];

    default:
      console.log(`[WaiverDispatcher] Unsupported waiver type: ${waiverConfig.type}`);
      return [];
  }
}
