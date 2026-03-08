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
 * Generates the full queue of challenges at the start of the session.
 */
export async function initializeCaptchaChallenges(config: { count: number; difficulty: string }) {
  const tasks = [];
  
  for (let i = 0; i < config.count; i++) {
    tasks.push({
      type: "captcha",
      status: "pending" as const,
      vault: {
        secret: generateRandomSecret(config.difficulty),
      }
    });
  }

  return tasks;
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
