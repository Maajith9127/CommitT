import { initializeCaptchaChallenges, verifyCaptchaChallenge } from "./captcha";

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

/**
 * verifyWaiverChallenge(): THE WORKFLOW ROUTER (SOLVE PHASE)
 * 
 * DESIGN RATIONALE:
 * This is the counterpart to initializeWaiverChallenges. It routes the 
 * user's solution attempt to the correct specialized handler.
 */
export async function verifyWaiverChallenge(
  ctx: any, 
  instance: any, 
  solution: string
) {
  const waiverConfig = instance.penalty_waiver;
  const waiverState = instance.waiver_state;
  
  if (!waiverConfig || !waiverState) {
    return { success: false, quotaReached: false, challenges: [] };
  }

  // 1. ROUTE TO THE CORRECT VERIFIER
  switch (waiverConfig.type) {
    case "captcha":
      return await verifyCaptchaChallenge(
        waiverState.challenges || [], 
        solution, 
        waiverConfig.config
      );

    default:
      console.log(`[WaiverDispatcher] Unsupported verify type: ${waiverConfig.type}`);
      return { success: false, quotaReached: false, challenges: waiverState.challenges || [] };
  }
}
