
import { MutationCtx } from "../../_generated/server";
import { Id, Doc } from "../../_generated/dataModel";

/**
 * Arguments for creating a single task instance (legacy path).
 *
 * NOTE: This type DUPLICATES `InstanceCreateArgs` in `core/instances/service.ts`.
 * Both must be kept in sync. If you add a field here, add it there too.
 *
 * `penalty` and `penalty_waiver` are IMMUTABLE SNAPSHOTS — they preserve
 * the original accountability contract and cannot be changed after creation.
 */
export type InstanceCreateArgs = {
  task_id: Id<"tasks">;
  assignee_id: string;
  start: number;
  end: number;
  title: string;
  description: string;
  recurrence: any;
  conditions: any[];
  config: Doc<"tasks">["config"];
  penalty?: Doc<"taskInstances">["penalty"];               // Frozen snapshot from parent task
  penalty_waiver?: Doc<"taskInstances">["penalty_waiver"]; // Frozen snapshot from parent task
  next_instance_id?: Id<"taskInstances">;
  status?: "pending" | "proceeding" | "proceeded" | "failed";
};

/**
 * Core business logic for creating a single task instance.
 * 
 * This is a shared utility used by:
 * 1. `createAllInstances` (bulk generation)
 * 2. Manual instance creation (one-off exceptions)
 * 
 * It handles the raw DB insertion.
 */
export async function createInstanceInternal(
  ctx: MutationCtx, 
  args: InstanceCreateArgs
): Promise<Id<"taskInstances">> {

  let processedConditions = args.conditions;

  // ─────────────────────────────────────────────────────────────────────────────
  // FEATURE: Randomized "Stay Throughout" Checkpoint Generation (Fixed 5-Min Blocks)
  // ─────────────────────────────────────────────────────────────────────────────
  // A task requiring continuous verification ("stay_throughout") is strictly divided
  // into discrete 5-minute chunks, regardless of its total duration.
  //
  // Depending on the configured "intensity", each 5-minute chunk has a probability 
  // of triggering a verification ping. This means a user is assumed compliant by 
  // default, and we randomly spot-check them based on their strictness settings.
  // 
  // - Relaxed: ~20% chance a 5-min chunk gets a ping
  // - Moderate: ~50% chance a 5-min chunk gets a ping
  // - Strict: ~80% chance a 5-min chunk gets a ping
  //
  // Note: A 5-minute task on "Relaxed" has an 80% chance of NEVER getting pinged.
  // ─────────────────────────────────────────────────────────────────────────────
  if (args.config.verification_style === "stay_throughout") {
    // @ts-ignore - intensity exists strictly when style is stay_throughout
    const intensity = args.config.stay_throughout_config?.intensity ?? "moderate";
    
    // 1. Define the probability weight based on Intensity
    let probabilityWeight = 0.50; // Moderate: 50% chance per 5 mins
    if (intensity === "relaxed") probabilityWeight = 0.20;
    if (intensity === "strict") probabilityWeight = 0.80;
    
    // 2. Define our global fixed chunk size (5 minutes in milliseconds)
    const CHUNK_SIZE_MS = 5 * 60 * 1000;
    const durationMs = args.end - args.start;
    
    if (durationMs > 0) {
      const checkpoints: { scheduled_time: number; window_end_time: number; status: "pending" }[] = [];
      
      // 3. Slice the total duration into 5-minute blocks 
      // Math.ceil handles partial chunks gracefully (e.g. a 12-min task becomes 3 chunks)
      const totalChunks = Math.ceil(durationMs / CHUNK_SIZE_MS);
      
      for (let i = 0; i < totalChunks; i++) {
        const chunkStart = args.start + (i * CHUNK_SIZE_MS);
        
        // The last chunk might naturally overhang the task's actual end time. 
        // We strict-cap the boundary so verifications never bleed out of the task window.
        const chunkEnd = Math.min(args.end, chunkStart + CHUNK_SIZE_MS);
        const actualChunkDuration = chunkEnd - chunkStart;
        
        // Skip abnormally small leftover fragments (less than 1 minute) 
        // to avoid generating impossible, instant-expiring pings right at the buzzer.
        if (actualChunkDuration < 60 * 1000) continue;
        
        // 4. Roll the dice: Does this specific 5-minute chunk get a random spot-check?
        if (Math.random() <= probabilityWeight) {
          // It passed the weight roll! Generate a random drop-in time within this specific chunk
          const randomOffset = Math.random() * actualChunkDuration;
          const scheduledTime = Math.floor(chunkStart + randomOffset);
          
          checkpoints.push({
            scheduled_time: scheduledTime,
            // The verification window lives entirely within the bounds of this specific chunk.
            window_end_time: Math.floor(chunkEnd),
            status: "pending" as const,
          });
        }
      }
      
      // 5. Apply Checkpoints to State
      // All defined conditions (location, picture, etc.) sync seamlessly to this exact 
      // randomized array of checkpoints so the UI verifies them concurrently.
      if (checkpoints.length > 0) {
        // Sort chronologically just as a safety net before DB insertion
        checkpoints.sort((a, b) => a.scheduled_time - b.scheduled_time);
        
        processedConditions = args.conditions.map(c => ({
          ...c,
          checkpoints: JSON.parse(JSON.stringify(checkpoints)) // Ensure pristine deep copy
        }));
      }
    }
  }

  const instanceId = await ctx.db.insert("taskInstances", {
    task_id: args.task_id,
    assignee_id: args.assignee_id,
    status: args.status ?? "pending",
    start: args.start,
    end: args.end,
    title: args.title,
    description: args.description,
    recurrence: args.recurrence,
    conditions: processedConditions,
    config: args.config,
    penalty: args.penalty,
    penalty_waiver: args.penalty_waiver,
    next_instance_id: args.next_instance_id,
  });

  return instanceId;
}
