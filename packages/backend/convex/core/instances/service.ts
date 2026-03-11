/**
 * INSTANCES SERVICE
 * ─────────────────────────────────────────────────────────────────────────────
 * This module is the core engine for managing Task Instances (occurrences).
 * It handles the lifecycle of an individual event: creation, rules-based
 * checkpoint generation, series expansion, and temporal rescheduling.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { MutationCtx } from "../../_generated/server";
import { Id, Doc } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import { generateTimeSlots } from "./generator";

// ─────────────────────────────────────────────────────────────────────────────
// [SECTION] DOMAIN RULE ENGINES
// These functions encode the "How" of verification. They are pure logic engines
// that transform a time window into a set of actionable checkpoints.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates randomized 5-minute checkpoints for "Stay Throughout" tasks.
 * 
 * Logic:
 * 1. Divide the total duration into 5-minute chunks.
 * 2. Apply a probability weight based on user-configured 'intensity'.
 * 3. Randomly select chunks for verification to create an unpredictable schedule.
 * 4. Auto-verify past chunks to prevent unfair failure for late-recorded tasks.
 */
function generateStayThroughoutCheckpoints(args: {
  start: number;
  end: number;
  conditions: any[];
  config: Doc<"taskInstances">["config"];
}) {
  const intensity = args.config.stay_throughout_config?.intensity ?? "moderate";
  
  // Weights determine the likelihood of a 5-minute slot being picked for verification
  let probabilityWeight = 0.50; // Moderate: 50% chance
  if (intensity === "relaxed") probabilityWeight = 0.20;
  if (intensity === "strict") probabilityWeight = 0.80;
  
  const CHUNK_SIZE_MS = 5 * 60 * 1000;
  const durationMs = args.end - args.start;
  const checkpoints: any[] = [];
  
  if (durationMs <= 0) return undefined;
  
  const totalChunks = Math.ceil(durationMs / CHUNK_SIZE_MS);
  for (let i = 0; i < totalChunks; i++) {
    const chunkStart = args.start + (i * CHUNK_SIZE_MS);
    const chunkEnd = Math.min(args.end, chunkStart + CHUNK_SIZE_MS); // Cap at task end
    
    // Skip chunks shorter than 60s (impossible to verify)
    if ((chunkEnd - chunkStart) < 60 * 1000) continue;
    
    // Probability Roll: The "Game Logic" of the spot-check system
    if (Math.random() <= probabilityWeight) {
      const verificationStatus: Record<string, string> = {};
      const isPast = chunkStart < Date.now();
      
      // Initialize pings. If the time is already past, we mark as verified
      // to avoid penalizing the user for system delays or late task creation.
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
 * 
 * Logic: Creates exactly ONE checkpoint starting from the task start 
 * and ending after the configured 'grace_period'.
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

/**
 * Arguments for creating a single task instance.
 *
 * `penalty` and `penalty_waiver` are IMMUTABLE SNAPSHOTS copied from the
 * parent task at creation time. They define the contract for this specific
 * occurrence and cannot be changed retroactively.
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
  task_strict_until?: number;                           // Inherited from master task rules
  next_instance_id?: Id<"taskInstances">;
  status?: "pending" | "proceeding" | "proceeded" | "failed";
};

/**
 * Hydrates and persists a single task instance into the database.
 * 
 * Responsibilities:
 * 1. Initializing condition statuses to 'neutral'.
 * 2. Invoking rule engines to generate the appropriate checkpoints.
 * 3. Saving the final document to the 'taskInstances' table.
 */
async function createOne(
  ctx: MutationCtx,
  args: InstanceCreateArgs
): Promise<Id<"taskInstances">> {
  // Reset all verification conditions to neutral start state
  let processedConditions = args.conditions.map((c: any) => ({
    ...c,
    status: "neutral" as const,
  }));

  let rootCheckpoints: any[] | undefined = undefined;

  // Delegate checkpoint creation based on user preference
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

  // ─────────────────────────────────────────────────────────────────────────────
  // THE STEEL VAULT — Strict Mode Inheritance
  // ─────────────────────────────────────────────────────────────────────────────
  // If the master task is currently in "Strict Mode", we lock this instance
  // until its own completion time. This prevents the user from "editing out"
  // of a commitment that has already begun its lock-in phase.
  //
  // CRITICAL: We also set is_manual_edit=true to ensure these locked instances
  // are protected from being purged during generic task updates.
  // ─────────────────────────────────────────────────────────────────────────────
  let instanceStrictUntil: number | undefined = undefined;
  let isManualEdit = false;
  if (args.task_strict_until && args.start < args.task_strict_until) {
    instanceStrictUntil = args.end;
    isManualEdit = true;
  }

  // Persist to Convex
  const instanceId = await ctx.db.insert("taskInstances", {
    task_id: args.task_id,
    assignee_id: args.assignee_id,
    status: args.status ?? "pending",
    start: args.start,
    end: args.end,
    strict_until: instanceStrictUntil,
    is_manual_edit: isManualEdit,
    title: args.title,
    description: args.description,
    recurrence: args.recurrence,
    conditions: processedConditions,
    checkpoints: rootCheckpoints,
    config: args.config,
    penalty: args.penalty,                 // Immutable snapshot — never updated after creation
    penalty_waiver: args.penalty_waiver,   // Immutable snapshot — never updated after creation
    next_instance_id: args.next_instance_id,
  });

  return instanceId;
}

/**
 * Generates the entire recurrence series (1 year) for a task.
 * 
 * Responsibilities:
 * 1. Calculate valid time slots using the Recurrence Engine (generator.ts).
 * 2. Create individual instance records for every slot.
 * 3. Link them in a chain (Linked List) via `next_instance_id`.
 * 
 * @returns The ID of the first (next) upcoming instance.
 */
async function generateSeries(
  ctx: MutationCtx,
  taskId: Id<"tasks">,
  fromTime: number = Date.now(),
): Promise<Id<"taskInstances"> | null> {
  const task = await ctx.db.get(taskId);
  if (!task) return null;

  // IST (Asia/Kolkata) Offset: 330 minutes
  // TODO: Fetch this from the User's profile settings in future updates.
  const timezoneOffset = 330;

  // 1. Calculate future dates based on recurrence rules
  const slots = generateTimeSlots(task.recurrence, fromTime, timezoneOffset);

  if (slots.length === 0) return null;

  // 2. BULK FETCH EXISTING INSTANCES
  // We fetch all existing instances for this user across the generation horizon.
  // This allows us to avoid overlapping with default instances of other tasks,
  // manual exceptions, and strict mode locks.
  const existingInstances = await ctx.db
    .query("taskInstances")
    .withIndex("by_assignee_start", (q) => q.eq("assignee_id", task.assignee_id).gte("start", fromTime))
    .collect();

  console.log(`[Service:generateSeries] Fetched ${existingInstances.length} existing instances for collision check.`);

  // 3. Map slots to Database Records — with Collision Avoidance
  const instanceIds: Id<"taskInstances">[] = [];
  for (const slot of slots) {
    // High-performance overlap check against pre-fetched local cache
    const overlappingEvent = existingInstances.find(ex => 
      slot.startTime < ex.end && ex.start < slot.endTime
    );

    if (overlappingEvent) {
      console.log(`[Service:generateSeries] COLLISION DETECTED: Skipping slot ${new Date(slot.startTime).toISOString()} because it overlaps with existing instance: "${overlappingEvent.title}"`);
      continue; // Prevent overlapping instances; priority goes to existing ones.
    }

    const instanceId = await createOne(ctx, {
      task_id: taskId,
      assignee_id: task.assignee_id,
      status: "pending",
      start: slot.startTime,
      end: slot.endTime,
      title: task.title,
      description: task.description,
      recurrence: task.recurrence,
      conditions: task.conditions,
      config: task.config,
      penalty: task.penalty,                 // Snapshot from master task rules at generation time
      penalty_waiver: task.penalty_waiver,   // Snapshot from master task rules at generation time
      task_strict_until: task.strict_until,
    });
    instanceIds.push(instanceId);
  }

  // 3. Link the series for easy traversal (Next-Pointer pattern)
  for (let i = 0; i < instanceIds.length - 1; i++) {
    await ctx.db.patch(instanceIds[i], {
      next_instance_id: instanceIds[i + 1],
    });
  }

  return instanceIds[0];
}

/**
 * Performs cleanup for a recurring series.
 * 
 * Logic:
 * 1. Cancel background jobs (alarms) for future pings.
 * 2. Delete pending/future instances.
 * 3. Preserves historic records (status === "proceeded") for accounting/logs.
 */
async function cleanupFuture(ctx: MutationCtx, taskId: Id<"tasks">) {
  const now = Date.now();
  const allInstances = await ctx.db
    .query("taskInstances")
    .withIndex("by_task", (q: any) => q.eq("task_id", taskId))
    .collect();

  for (const instance of allInstances) {
    // 1. Terminal State Check: We only clean up "In-Flight" instances (pending, proceeding, waiver_active).
    // Finished history (proceeded, penalized, waived) is always preserved.
    const isFinished = instance.status === "proceeded" || instance.status === "penalized" || instance.status === "waived";

    // 2. Cleanup Logic: Delete if it's not finished AND it's not a manual user exception 
    // AND it's not locked in the Steel Vault.
    const isLocked = instance.strict_until && now < instance.strict_until;

    if (!isFinished && !instance.is_manual_edit && !isLocked) {
      // 1. Defuse verification heartbeats
      if (instance.scheduled_job_id) {
        await ctx.scheduler.cancel(instance.scheduled_job_id);
      }
      
      // 2. Defuse penalty enforcement jobs (The Bomb)
      if (instance.enforcement_job_id) {
        await ctx.scheduler.cancel(instance.enforcement_job_id);
      }

      await ctx.db.delete(instance._id);
    }
  }
}

/**
 * Public instance management interface.
 */
export const Instances = {
  createOne,
  generateSeries,
  cleanupFuture,
  update,
  delete: deleteInstance,
  checkOverlap,
};

/**
 * Updates an individual task instance with smart temporal rescheduling.
 * 
 * Logic:
 * 1. Handle status normalization (Completed -> Proceeded).
 * 2. If 'start' or 'end' times move, trigger "Intelligent Rescheduling":
 *    - Re-run the Rule Engines to spawn new checkpoints for the new slot.
 *    - Reset all conditions to 'neutral' to ensure a fresh verification lifecycle.
 */
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
  
  const existing = await ctx.db.get(id);
  if (!existing) return;

  // ─────────────────────────────────────────────────────────────────────────────
  // THE STEEL VAULT — Service Layer Enforcement
  // ─────────────────────────────────────────────────────────────────────────────
  if (existing.strict_until && Date.now() < existing.strict_until) {
    throw new Error("[STRICT_LOCK_ACTIVE] This instance is locked and cannot be modified.");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MANUAL EXCEPTION TRACKING
  // If the user manually changed the time slot or metadata (title/desc),
  // we mark it as a "Manual Exception" to protect it from series regeneration.
  // ─────────────────────────────────────────────────────────────────────────────
  if (
    updates.start !== undefined || 
    updates.end !== undefined || 
    updates.title !== undefined || 
    updates.description !== undefined
  ) {
    patch.is_manual_edit = true;
  }

  // Normalize UI status to Backend state machine
  if (patch.status === "completed") patch.status = "proceeded";
  if (patch.status === "skipped") patch.status = "failed";

  // Temporal Sync: Ensure verification logic follows the new time slot
  if (updates.start !== undefined || updates.end !== undefined) {
    // Note: 'existing' is already fetched above for the lock check
    
    if (existing) {
      const newStart = updates.start ?? existing.start;
      const newEnd = updates.end ?? existing.end;

      console.log(`[INSTANCES:update] Triggering RESCHEDULE for instance ${id}`);

      // Recalculate verification checkpoints for the new window
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

      // Reset conditions (Previous effort is invalidated by a time change)
      patch.conditions = existing.conditions.map((c: any) => ({
        ...c,
        status: "neutral",
      }));
    }
  }

  await ctx.db.patch(id, patch);
}

/**
 * Safely deletes an instance and tears down its background listeners.
 */
async function deleteInstance(ctx: MutationCtx, id: Id<"taskInstances">) {
  const instance = await ctx.db.get(id);
  if (!instance) return;

  // ─────────────────────────────────────────────────────────────────────────────
  // THE STEEL VAULT — Service Layer Enforcement (Delete)
  // ─────────────────────────────────────────────────────────────────────────────
  if (instance.strict_until && Date.now() < instance.strict_until) {
    throw new Error("[STRICT_LOCK_ACTIVE] This instance is locked and cannot be deleted.");
  }

  // 1. Defuse verification heartbeats
  if (instance.scheduled_job_id) {
    await ctx.scheduler.cancel(instance.scheduled_job_id);
  }

  // 2. Defuse penalty enforcement jobs (The Bomb)
  if (instance.enforcement_job_id) {
    await ctx.scheduler.cancel(instance.enforcement_job_id);
  }

  await ctx.db.delete(id);
}

/**
 * Schedule Conflict Utility.
 * Searches for any other instance assigned to this user that overlaps
 * with the provided time range.
 * 
 * @returns The conflicting document or null.
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

  // Efficient range query using compound index
  const existingInRegion = await ctx.db
    .query("taskInstances")
    .withIndex("by_assignee_start", (q: any) => 
      q.eq("assignee_id", assignee_id)
       .lt("start", end)
    )
    .collect();

  // Fine-grained filter for end-time overlap
  const overlap = existingInRegion.find(
    (inst: any) => inst._id !== exclude_id && inst.end > start
  );

  return overlap ?? null;
}

