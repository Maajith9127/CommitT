import { MutationCtx } from "../../_generated/server";
import { Id, Doc } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import { generateTimeSlots } from "./generator";

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN RULE ENGINES (Checkpoints & Verification)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates randomized 5-minute checkpoints for "Stay Throughout" tasks.
 */
function generateStayThroughoutCheckpoints(args: {
  start: number;
  end: number;
  conditions: any[];
  config: Doc<"taskInstances">["config"];
}) {
  const intensity = args.config.stay_throughout_config?.intensity ?? "moderate";
  let probabilityWeight = 0.50;
  if (intensity === "relaxed") probabilityWeight = 0.20;
  if (intensity === "strict") probabilityWeight = 0.80;
  
  const CHUNK_SIZE_MS = 5 * 60 * 1000;
  const durationMs = args.end - args.start;
  const checkpoints: any[] = [];
  
  if (durationMs <= 0) return undefined;
  
  const totalChunks = Math.ceil(durationMs / CHUNK_SIZE_MS);
  for (let i = 0; i < totalChunks; i++) {
    const chunkStart = args.start + (i * CHUNK_SIZE_MS);
    const chunkEnd = Math.min(args.end, chunkStart + CHUNK_SIZE_MS);
    
    if ((chunkEnd - chunkStart) < 60 * 1000) continue;
    
    if (Math.random() <= probabilityWeight) {
      const verificationStatus: Record<string, string> = {};
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
  
  if (checkpoints.length === 0) return undefined;
  return checkpoints.sort((a, b) => a.start - b.start);
}

/**
 * Generates a single arrival-window checkpoint for "Just Show Up" tasks.
 */
function generateJustShowUpCheckpoints(args: {
  start: number;
  end: number;
  conditions: any[];
  config: Doc<"taskInstances">["config"];
}) {
  const graceMs = (args.config.grace_period_minutes ?? 0) * 60 * 1000;
  const checkpointEnd = Math.min(args.end, args.start + graceMs);
  
  const verificationStatus: Record<string, string> = {};
  const isPast = args.start < Date.now();
  for (const cond of args.conditions) {
    verificationStatus[cond.metric_key] = isPast ? "verified" : "pending";
  }

  return [{
    start: Math.floor(args.start),
    end: Math.floor(checkpointEnd),
    start_readable: new Date(args.start).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }),
    end_readable: new Date(checkpointEnd).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }),
    verification_status: verificationStatus,
  }];
}

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
  // FEATURE: Unified Checkpoint Generation
  // ─────────────────────────────────────────────────────────────────────────────
  // We delegate the generation of verification windows to specialized rule engines.
  // This ensures consistency between different parts of the system (create vs. update).
  // ─────────────────────────────────────────────────────────────────────────────
  if (args.config.verification_style === "stay_throughout") {
    rootCheckpoints = generateStayThroughoutCheckpoints({
      start: args.start,
      end: args.end,
      conditions: args.conditions,
      config: args.config,
    });
  } else if (args.config.verification_style === "just_show_up") {
    rootCheckpoints = generateJustShowUpCheckpoints({
      start: args.start,
      end: args.end,
      conditions: args.conditions,
      config: args.config,
    });
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
  checkOverlap,
};

async function update(
  ctx: MutationCtx,
  id: Id<"taskInstances">,
  updates: {
    status?: "pending" | "completed" | "failed" | "skipped" | "proceeding" | "proceeded";
    start?: number;
    end?: number;
    [key: string]: any;
  }
) {
  const patch: any = { ...updates };
  
  // Normalization: Map legacy UI statuses to backend domain statuses
  if (patch.status === "completed") patch.status = "proceeded";
  if (patch.status === "skipped") patch.status = "failed";

  // ─────────────────────────────────────────────────────────────────────────────
  // FEATURE: Intelligent Temporal Rescheduling
  // ─────────────────────────────────────────────────────────────────────────────
  // If the start or end time changes, the existing checkpoints (verification 
  // windows) become mathematically invalid. We must recalculate them using 
  // the exact same rule engines used during initial creation.
  // ─────────────────────────────────────────────────────────────────────────────
  if (updates.start !== undefined || updates.end !== undefined) {
    const existing = await ctx.db.get(id);
    
    if (existing) {
      const newStart = updates.start ?? existing.start;
      const newEnd = updates.end ?? existing.end;

      console.log(`[SERVICE:update] TEMPORAL_SHIFT_DETECTED for ${id}. Recalculating checkpoints.`);

      // 1. Recalculate checkpoints using the centralized rule engines
      if (existing.config.verification_style === "stay_throughout") {
        patch.checkpoints = generateStayThroughoutCheckpoints({
          start: newStart,
          end: newEnd,
          conditions: existing.conditions,
          config: existing.config,
        });
      } else if (existing.config.verification_style === "just_show_up") {
        patch.checkpoints = generateJustShowUpCheckpoints({
          start: newStart,
          end: newEnd,
          conditions: existing.conditions,
          config: existing.config,
        });
      }

      // 2. Reset condition progress
      // When a task moves to a new slot, any previous progress/neutral status
      // should be cleared to ensure a clean start in the new window.
      patch.conditions = existing.conditions.map((c: any) => ({
        ...c,
        status: "neutral",
      }));
    }
  }

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

/**
 * Checks for schedule overlaps for a specific user and time range.
 */
async function checkOverlap(
  ctx: MutationCtx,
  args: {
    assignee_id: string;
    start: number;
    end: number;
    exclude_id?: Id<"taskInstances">;
  }
) {
  const { assignee_id, start, end, exclude_id } = args;

  const existingInRegion = await ctx.db
    .query("taskInstances")
    .withIndex("by_assignee_start", (q: any) => 
      q.eq("assignee_id", assignee_id)
       .lt("start", end)
    )
    .collect();

  const overlap = existingInRegion.find(
    (inst: any) => inst._id !== exclude_id && inst.end > start
  );

  return overlap ?? null;
}
