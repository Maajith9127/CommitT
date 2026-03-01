import { MutationCtx } from "../../_generated/server";
import { Id, Doc } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import { generateTimeSlots } from "./generator";

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
  next_instance_id?: Id<"taskInstances">;
  status?: "pending" | "proceeding" | "proceeded" | "failed";
};

async function createOne(
  ctx: MutationCtx,
  args: InstanceCreateArgs
): Promise<Id<"taskInstances">> {
  // By default, every condition inside a brand new task instance starts out completely neutral.
  // It is neither verified nor failed until the user explicitly takes action (or misses the window).
  let processedConditions = args.conditions.map((c: any) => ({
    ...c,
    status: "neutral" as const,
  }));
  let rootCheckpoints: any[] | undefined = undefined;

  // ─────────────────────────────────────────────────────────────────────────────
  // FEATURE: Randomized "Stay Throughout" Checkpoint Generation (Fixed 5-Min Blocks)
  // ─────────────────────────────────────────────────────────────────────────────
  // Core Domain Concept: If a task requires continuous verification ("stay_throughout"), 
  // we strictly chunk its entire time block into discrete 5-minute segments.
  //
  // Depending on the user's explicit "intensity" setting, each 5-minute chunk runs
  // a probability check. This fundamentally flips the logic from "Guilty" to 
  // "Innocent Until Proven Guilty" - users are assumed compliant, but get randomly 
  // spot-checked at unexpected times based on their configured strictness.
  // 
  // Example Probabilities per 5 Minutes:
  // - Relaxed: ~20% chance of a random ping in a given chunk.
  // - Moderate: ~50% chance of a random ping in a given chunk.
  // - Strict: ~80% chance of a random ping in a given chunk.
  //
  // Edge Case Handling: A 5-minute task on "Relaxed" has an 80% chance of NEVER 
  // getting a verification ping!
  // ─────────────────────────────────────────────────────────────────────────────
  if (args.config.verification_style === "stay_throughout") {
    // @ts-ignore - 'intensity' is guaranteed to exist when verification_style is 'stay_throughout'
    const intensity = args.config.stay_throughout_config?.intensity ?? "moderate";
    
    // 1. Establish the exact weighted probability based on the Intensity matrix
    let probabilityWeight = 0.50; // Moderate: 50% chance per 5 mins
    if (intensity === "relaxed") probabilityWeight = 0.20;
    if (intensity === "strict") probabilityWeight = 0.80;
    
    // 2. Define the global standard block boundary (5 minutes in milliseconds)
    const CHUNK_SIZE_MS = 5 * 60 * 1000;
    const durationMs = args.end - args.start;
    
    if (durationMs > 0) {
      const checkpoints: { 
        start: number; 
        end: number; 
        start_readable: string;
        end_readable: string;
        verification_status: Record<string, "pending" | "verified" | "failed">;
      }[] = [];
      
      // 3. Slice the entire session block mathematically into chunks.
      // We use Math.ceil to elegantly capture any fractional leftover time. 
      // (e.g., A 12-minute session results in exactly [5min, 5min, 2min] blocks).
      const totalChunks = Math.ceil(durationMs / CHUNK_SIZE_MS);
      
      for (let i = 0; i < totalChunks; i++) {
        // Calculate the absolute epoch bounds for the current chunk iteration
        const chunkStart = args.start + (i * CHUNK_SIZE_MS);
        
        // Strict-capping: The final boundary chunk might project past the task's valid end time.
        // We cap it cleanly at `args.end` to guarantee pings NEVER bleed outside the session.
        const chunkEnd = Math.min(args.end, chunkStart + CHUNK_SIZE_MS);
        const actualChunkDuration = chunkEnd - chunkStart;
        
        // Safety Valve: If the terminating chunk fragment is less than 60 seconds, 
        // silently skip it. You cannot reasonably verify a ping at the literal buzzer.
        if (actualChunkDuration < 60 * 1000) continue;
        
        // 4. Execution Roll: Does this 5-minute chunk get selected for verification?
        if (Math.random() <= probabilityWeight) {
          // The user's goal is simply to verify anytime within this specific 5-minute block.
          // No confusing sub-random offsets. The checkpoint boundaries ARE the chunk boundaries.
          
          // Build the exact dict tracking every single active condition at this specific moment
          const verificationStatus: Record<string, "pending" | "verified" | "failed"> = {};
          // Protection Logic: If the user creates the Task AFTER this specific checkpoint's start time,
          // they mathematically cannot complete it. We auto-verify it to prevent unfair penalization!
          const isPast = chunkStart < Date.now();
          for (const cond of args.conditions) {
            verificationStatus[cond.metric_key] = isPast ? "verified" : "pending";
          }
          
          checkpoints.push({
            start: Math.floor(chunkStart),
            end: Math.floor(chunkEnd),
            start_readable: new Date(chunkStart).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }),
            end_readable: new Date(chunkEnd).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }),
            verification_status: verificationStatus,
          });
        }
      }
      
      // 5. Root Array Finalization
      if (checkpoints.length > 0) {
        checkpoints.sort((a, b) => a.start - b.start);
        rootCheckpoints = checkpoints; // Securely assign to root payload variable
      }
    }
  }

  // Final Persist: Push the completed, hydrated Task Instance to the Convex Data Store
  const instanceId = await ctx.db.insert("taskInstances", {
    task_id: args.task_id,
    assignee_id: args.assignee_id,
    status: args.status ?? "pending",
    start: args.start,
    end: args.end,
    title: args.title,
    description: args.description,
    recurrence: args.recurrence,
    conditions: processedConditions, // Initialized globally as neutral
    checkpoints: rootCheckpoints,    // The newly structured root-level timeline mapping
    config: args.config,
    next_instance_id: args.next_instance_id,
  });

  return instanceId;
}

/**
 * Generates ALL task instances for the next 1 year and inserts them as
 * DB records, linked together via next_instance_id (linked-list chain).
 *
 * Returns the ID of the FIRST instance, or null if no slots found.
 */
async function generateSeries(
  ctx: MutationCtx,
  taskId: Id<"tasks">,
  fromTime: number = Date.now(),
): Promise<Id<"taskInstances"> | null> {
  // 1. Fetch the task to get recurrence rules and snapshot data
  const task = await ctx.db.get(taskId);
  if (!task) {
    console.log(`[Instances.generateSeries] Task ${taskId} not found.`);
    return null;
  }

  // 2. Build recurrence config
  const recurrence = task.recurrence;

  // TODO: Get timezone from user profile. Defaulting to IST (330 minutes) for now.
  const timezoneOffset = 330;

  // 3. Generate all time slots for the next year
  const slots = generateTimeSlots(recurrence, fromTime, timezoneOffset);

  if (slots.length === 0) {
    console.log(`[Instances.generateSeries] No slots generated for task ${taskId}.`);
    return null;
  }

  console.log(`[Instances.generateSeries] Generating ${slots.length} instances for task ${taskId}`);

  // 4. Insert all instances (without next_instance_id first)
  const instanceIds: Id<"taskInstances">[] = [];

  for (const slot of slots) {
    const instanceId = await createOne(ctx, {
      task_id: taskId,
      assignee_id: task.assignee_id,
      status: "pending",
      start: slot.startTime,
      end: slot.endTime,
      title: task.title,
      description: task.description,
      recurrence: recurrence,
      conditions: task.conditions,
      config: task.config,
      // Will be linked in the next step
    });
    instanceIds.push(instanceId);
  }

  // 5. Link the chain: each instance points to the next one
  for (let i = 0; i < instanceIds.length - 1; i++) {
    await ctx.db.patch(instanceIds[i], {
      next_instance_id: instanceIds[i + 1],
    });
  }
  // Last instance has no next_instance_id (undefined by default)

  console.log(`[Instances.generateSeries] Created ${instanceIds.length} instances.`);

  return instanceIds[0];
}

/**
 * Deletes all FUTURE instances for a task and cancels any active scheduled jobs.
 * Past instances (status === "proceeded") are preserved as history.
 */
async function cleanupFuture(ctx: MutationCtx, taskId: Id<"tasks">) {
  const now = Date.now();

  // Get ALL instances for this task
  const allInstances = await ctx.db
    .query("taskInstances")
    .withIndex("by_task", (q: any) => q.eq("task_id", taskId))
    .collect();

  for (const instance of allInstances) {
    // Only delete future/pending instances — keep past ones as history
    if (instance.start >= now || instance.status === "pending") {
      // Cancel any active scheduled job
      if (instance.scheduled_job_id) {
        await ctx.scheduler.cancel(instance.scheduled_job_id);
      }
      await ctx.db.delete(instance._id);
    }
  }
}

export const Instances = {
  createOne,
  generateSeries,
  cleanupFuture,
  update,
  delete: deleteInstance,
};

async function update(
  ctx: MutationCtx,
  id: Id<"taskInstances">,
  updates: {
    status?: "pending" | "completed" | "failed" | "skipped" | "proceeding" | "proceeded";
    [key: string]: any;
  }
) {
  const patch: any = { ...updates };
  if (patch.status === "completed") patch.status = "proceeded";
  if (patch.status === "skipped") patch.status = "failed";

  await ctx.db.patch(id, patch);
}

async function deleteInstance(ctx: MutationCtx, id: Id<"taskInstances">) {
  const instance = await ctx.db.get(id);
  if (!instance) return;

  // Cancel any scheduled jobs associated with this instance
  if (instance.scheduled_job_id) {
    await ctx.scheduler.cancel(instance.scheduled_job_id);
  }

  await ctx.db.delete(id);
}
