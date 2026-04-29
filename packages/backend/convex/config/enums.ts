/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  ENUMS — Centralized Type-Safe Unions for the Entire Backend               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                            ║
 * ║  Every `v.union(v.literal(...))` in this file is the SINGLE SOURCE OF      ║
 * ║  TRUTH for that category. Schema, validators, and service logic all        ║
 * ║  reference these exports. NEVER inline a string literal for a status       ║
 * ║  or type elsewhere — always import from here.                              ║
 * ║                                                                            ║
 * ║  HOW TO ADD A NEW VALUE:                                                   ║
 * ║  1. Add the `v.literal("your_value")` to the appropriate enum below.       ║
 * ║  2. Run `convex dev` — TypeScript will flag every location that needs      ║
 * ║     to handle the new case (switch statements, conditionals, etc).         ║
 * ║  3. Update each flagged location.                                          ║
 * ║                                                                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// CONDITION SYSTEM — How metrics are compared and what data types they operate on
// ─────────────────────────────────────────────────────────────────────────────

export const relationEnum = v.union(
  v.literal("eq"),
  v.literal("neq"),
  v.literal("gt"),
  v.literal("gte"),
  v.literal("lt"),
  v.literal("lte"),
  v.literal("in"),
  v.literal("not_in"),
  v.literal("within"),
  v.literal("outside"),
  v.literal("exists"),
  v.literal("matches"),
  v.literal("range"),
);

export const targetTypeEnum = v.union(
  v.literal("number"),
  v.literal("string"),
  v.literal("boolean"),
  v.literal("array"),
  v.literal("range"),
  v.literal("file"),
  v.literal("log"),
);

export const permissionEnum = v.union(
  v.literal("manual"),
  v.literal("application"),
  v.literal("system"),
  v.literal("network"),
  v.literal("location"),
  v.literal("media"),
  v.literal("external"),
);

// ─────────────────────────────────────────────────────────────────────────────
// TASK VISIBILITY — Controls who can see a commitment
// ─────────────────────────────────────────────────────────────────────────────

export const visibilityEnum = v.union(
  v.literal("public"),
  v.literal("private"),
  v.literal("shared"),
);

// ─────────────────────────────────────────────────────────────────────────────
// TASK INSTANCE LIFECYCLE — The complete state machine for a single occurrence
// ─────────────────────────────────────────────────────────────────────────────
//
// State Machine Flow:
//
//   pending ──▶ proceeding ──▶ proceeded (✅ Success — all conditions met)
//                    │
//                    └──▶ failed ──▶ waiver_active ──▶ waived (✅ Saved by waiver)
//                                        │
//                                        └──▶ penalized (❌ Penalty executed)
//
// IMPORTANT: Once an instance reaches a terminal state (proceeded, waived, penalized),
// it is IMMUTABLE. No further status transitions are allowed.
//
export const taskStatusEnum = v.union(
  v.literal("pending"),        // Instance created, time window hasn't started yet
  v.literal("proceeding"),     // Time window is active, user should be completing the task
  v.literal("proceeded"),      // ✅ Verification passed — all conditions satisfied
  v.literal("failed"),         // ❌ Verification failed — conditions not met by window end
  v.literal("waiver_active"),  // 🔶 Waiver challenge offered — user has a deadline to complete it
  v.literal("waived"),         // ✅ User completed the waiver challenge — penalty cancelled
  v.literal("penalized"),      // ❌ Waiver expired or skipped — penalty was executed
);

export const conditionStatusEnum = v.union(
  v.literal("neutral"),
  v.literal("verified"),
  v.literal("failed"),
  v.literal("applied"),
  v.literal("waived"),
  v.literal("percentage"),
);

// ─────────────────────────────────────────────────────────────────────────────
// RECURRENCE — How often a task repeats
// ─────────────────────────────────────────────────────────────────────────────

export const recurrenceTypeEnum = v.union(
  v.literal("once"),
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("yearly"),
  v.literal("custom"),
);

export const recurrenceEndsTypeEnum = v.union(
  v.literal("never"),
  v.literal("after"),
  v.literal("on"),
);

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION — How the system checks if the user showed up
// ─────────────────────────────────────────────────────────────────────────────

export const verificationStyleEnum = v.union(
  v.literal("just_show_up"),     // Single check at any point during the window
  v.literal("stay_throughout"),  // Periodic checkpoint pings across the entire window
);

export const intensityEnum = v.union(
  v.literal("relaxed"),   // Lenient — more missed checkins allowed
  v.literal("moderate"),  // Balanced
  v.literal("strict"),    // Harsh — almost no missed checkins tolerated
);

// ─────────────────────────────────────────────────────────────────────────────
// PENALTY SYSTEM — What happens when a user fails and doesn't complete waiver
// ─────────────────────────────────────────────────────────────────────────────
//
// Each penalty type maps to a dedicated executor in:
//   `convex/core/penalty/executors/<type>.ts`
//
// The dispatcher reads `penalty.type` from the instance and routes to the
// correct executor. To add a new penalty:
//   1. Add a new literal here.
//   2. Create the executor file.
//   3. Register it in the dispatcher's switch statement.
//
export const penaltyTypeEnum = v.union(
  v.literal("embarrassing_photo"),  // Upload a cringe photo → sent via chosen channel
  v.literal("send_email"),          // Automated shame email to configured recipients
  v.literal("send_money"),          // Monetary deduction via payment integration
  v.literal("commit_direct"),       // Send penalty content to another Commit user
);

// ─────────────────────────────────────────────────────────────────────────────
// WAIVER SYSTEM — How a user can EARN forgiveness after failing
// ─────────────────────────────────────────────────────────────────────────────
//
// Each waiver type maps to a dedicated verifier in:
//   `convex/core/waivers/verifiers/<type>.ts`
//
// The waiver API receives user evidence, routes to the correct verifier,
// and the verifier decides pass/fail. All validation is SERVER-AUTHORITATIVE.
//
export const waiverTypeEnum = v.union(
  v.literal("captcha"),    // Solve N CAPTCHAs within the deadline
  v.literal("paragraph"),  // Type a 3000-word paragraph accurately
);

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGGING — Centralized system event tracking
// ─────────────────────────────────────────────────────────────────────────────

export const auditEventTypeEnum = v.union(
  v.literal("verification_success"), // The user passed the verification window
  v.literal("verification_failed"),  // The user failed the verification window
  v.literal("penalty_executed"),     // A penalty was actually detonated (charged, sent, etc.)
  v.literal("penalty_failed"),       // Added: A penalty failed to execute (e.g. Resend API error)
  v.literal("waiver_completed"),     // A waiver was successfully completed
  v.literal("instance_scheduled"),   // The system automatically scheduled the next task recurrence
);
