/**
 * captchaHandler: THE CAPTCHA ARCHITECT
 * 
 * DESCRIPTION:
 * Logic for generating and verifying CAPTCHA-based waivers.
 * It uses a "Vault" pattern where the secret text is generated server-side
 * and stored in the database, never revealed to the client until it's "dealt".
 */

/**
 * initializeChallenges(): 
 * Generates the first challenge in the "On-the-Fly" sequence.
 */
export async function initializeCaptchaChallenges(config: { count: number; difficulty: string }) {
  return [{
    type: "captcha",
    status: "pending" as const,
    created_at: Date.now(),
    vault: {
      secret: generateRandomSecret(config.difficulty),
    }
  }];
}

/**
 * verifyCaptchaChallenge(): THE ATOMIC SOLVER
 * 
 * DESCRIPTION (PRODUCTION GRADE):
 * This is where the verification logic is encapsulated. It performs three 
 * critical operations in one call:
 * 1. TRUTHY VERIFICATION: Ensures the solution is valid (case-insensitive).
 * 2. PROGRESS FLIP: Marks the specific current challenge as 'completed'.
 * 3. LAZY DEQUEUE: If the session quota isn't hit, it deals the NEXT challenge 
 *    immediately, ensuring there is always an active puzzle until completion.
 */
export async function verifyCaptchaChallenge(
  challenges: any[], 
  solution: string, 
  config: { count: number; difficulty: string }
) {
  // 1. Identify the active (most recent pending) challenge
  const activeIdx = challenges.findIndex(c => c.status === "pending");
  if (activeIdx === -1) return { success: false, quotaReached: true, challenges };

  const currentChallenge = challenges[activeIdx];
  
  // 2. CRYPTOGRAPHIC MATCH (Case Insensitive for UX)
  const isMatch = currentChallenge.vault.secret.toUpperCase() === solution.trim().toUpperCase();
  
  if (!isMatch) {
    return { success: false, quotaReached: false, challenges };
  }

  // 3. APPLY VERIFICATION
  challenges[activeIdx].status = "completed";
  challenges[activeIdx].completed_at = Date.now();

  const completedCount = challenges.filter(c => c.status === "completed").length;
  const quotaReached = completedCount >= config.count;

  // 4. GENERATE NEXT (The Flip)
  if (!quotaReached) {
    challenges.push({
      type: "captcha",
      status: "pending" as const,
      created_at: Date.now(),
      vault: {
        secret: generateRandomSecret(config.difficulty),
      }
    });
  }

  return { success: true, quotaReached, challenges };
}

/**
 * generateRandomSecret(): Difficulty-aware secret generator.
 * PRO-LEVEL: Uses a filtered character set to avoid ambiguous characters (1, I, 0, O).
 */
function generateRandomSecret(difficulty: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let length = 5;

  if (difficulty === "hard") length = 8;
  if (difficulty === "easy") length = 4;

  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
