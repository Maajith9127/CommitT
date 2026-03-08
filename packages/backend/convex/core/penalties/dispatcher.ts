import { Doc } from "../../_generated/dataModel";
import * as sendEmail from "./executors/send_email";

/**
 * dispatcher.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The "Registry" of all penalty executors. It reads the penalty type
 * from the instance and routes it to the correct executor.
 * 
 * DESIGN: Separate executors by penalty type for production scalability.
 */

export type PenaltyResult = {
  success: boolean;
  error?: string;
};

export async function dispatch(instance: Doc<"taskInstances">): Promise<PenaltyResult> {
  const { penalty } = instance;

  if (!penalty) {
    console.warn(`[DISPATCHER] No penalty found on instance ${instance._id}. Aborting.`);
    return { success: false, error: "NO_PENALTY_FOUND" };
  }

  console.log(`[DISPATCHER] Routing penalty of type '${penalty.type}' for instance ${instance._id}`);

  switch (penalty.type) {
    case "send_email":
      return await sendEmail.execute(instance);

    case "embarrassing_photo":
      // TODO: Implement executors/embarrassing_photo.ts
      console.log(`[DISPATCHER] Penalty '${penalty.type}' not yet implemented. Logging only.`);
      return { success: false, error: "NOT_IMPLEMENTED" };

    case "send_money":
      // TODO: Implement executors/send_money.ts
      console.log(`[DISPATCHER] Penalty '${penalty.type}' not yet implemented. Logging only.`);
      return { success: false, error: "NOT_IMPLEMENTED" };

    default:
      console.error(`[DISPATCHER] CRITICAL: Unknown penalty type received: ${penalty.type}`);
      return { success: false, error: "UNKNOWN_TYPE" };
  }
}
