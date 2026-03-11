import { MutationCtx } from "../../_generated/server";
import { Id, Doc } from "../../_generated/dataModel";
import { findConflict, formatConflictMessage } from "./conflictDetection";
import { Instances } from "../instances/service";
import { syncTaskSchedule } from "../../execution/scheduling/scheduler";
import { validateCommitment } from "./validator";

/**
 * Arguments for creating a new commitment (task).
 *
 * `penalty` and `penalty_waiver` define the accountability contract.
 * These are stored as master rules on the task, then SNAPSHOTTED onto
 * every generated instance to prevent retroactive manipulation.
 */
export type CreateArgs = {
  assignee_id: string;
  title: string;
  description: string;
  visibility: Doc<"tasks">["visibility"];
  recurrence: any;
  conditions: any[];
  config: Doc<"tasks">["config"];
  penalty: Doc<"tasks">["penalty"];               // What happens if user fails + doesn't complete waiver
  penalty_waiver: Doc<"tasks">["penalty_waiver"]; // The challenge that can defuse the penalty
  assigner_id: string; // Injected by the API layer after auth verification
};

/**
 * Core business logic for creating a commitment.
 * 
 * Orchestrates the entire creation flow:
 * 1. Validates domain rules (title length, recurrence validity, etc).
 * 2. Checks for scheduling conflicts with existing tasks.
 * 3. Persists the task definition to the database.
 * 4. Triggers the generation of task instances (occurrences) for the next year.
 * 5. Schedules the first occurrence if applicable.
 * 
 * @throws Error with code [TITLE_REQUIRED], [SCHEDULE_CONFLICT], etc. if validation fails.
 */
export async function createInternal(ctx: MutationCtx, args: CreateArgs) {
  // 1. VALIDATE INPUT (Domain Logic)
  const validation = validateCommitment({
    title: args.title,
    recurrence: args.recurrence,
    conditions: args.conditions,
    assigner_id: args.assigner_id,
    assignee_id: args.assignee_id,
    penalty: args.penalty,
    penalty_waiver: args.penalty_waiver,
  });

  console.log("[Service:createInternal] Validation result:", JSON.stringify(validation, null, 2));

  if (!validation.valid) {
    throw new Error(`[${validation.errorCode}] ${validation.error}`);
  }

  // 2. CHECK CONFLICTS
  const existingTasks = await ctx.db
    .query("tasks")
    .withIndex("by_assignee_id", (q) => q.eq("assignee_id", args.assignee_id))
    .collect();

  console.log(`[Service:createInternal] Checking conflicts against ${existingTasks.length} existing tasks`);

  const conflictResult = findConflict({
    assignee_id: args.assignee_id,
    title: args.title,
    recurrence: args.recurrence,
  }, existingTasks);

  if (conflictResult.hasConflict) {
    console.warn("[Service:createInternal] Conflict detected:", JSON.stringify(conflictResult, null, 2));
    throw new Error(`[SCHEDULE_CONFLICT] ${formatConflictMessage(conflictResult.details)}`);
  }

  console.log("[Service:createInternal] No conflicts found. Proceeding to insert.");

  // ─────────────────────────────────────────────────────────────────────
  // 3. RESOLVE PENALTY PHOTO URL
  // ─────────────────────────────────────────────────────────────────────
  // If the penalty contains a storageId (uploaded photo), resolve the
  // permanent public HTTPS URL now and embed it in the config. This way,
  // the client can display the image directly from `photoUrl` without
  // making an extra getUrl() query every time the task is loaded.
  //
  // We store BOTH:
  //   • storageId — immutable reference for deletion/re-resolution
  //   • photoUrl  — public HTTPS URL for direct display in the UI
  // ─────────────────────────────────────────────────────────────────────
  let resolvedPenalty = args.penalty;

  if (args.penalty?.type === "embarrassing_photo" && args.penalty?.config?.storageId) {
    const photoUrl = await ctx.storage.getUrl(args.penalty.config.storageId);

    if (photoUrl) {
      resolvedPenalty = {
        ...args.penalty,
        config: {
          ...args.penalty.config,
          photoUrl,  // Public HTTPS URL for direct UI rendering
        },
      };
      console.log("[Service:createInternal] Penalty photo URL resolved:", photoUrl);
    } else {
      console.warn("[Service:createInternal] WARNING: Could not resolve URL for storageId:", args.penalty.config.storageId);
    }
  }

  // 4. INSERT INTO DB
  const now = Date.now();
  const taskId = await ctx.db.insert("tasks", {
    assignee_id: args.assignee_id,
    title: args.title,
    description: args.description,
    visibility: args.visibility,
    recurrence: args.recurrence,
    conditions: args.conditions,
    config: args.config,
    penalty: resolvedPenalty,              // Master penalty rules with resolved photoUrl
    penalty_waiver: args.penalty_waiver,   // Master waiver rules (snapshotted to instances)
    assigner_id: args.assigner_id,
    created_at: now,
    updated_at: now,
  });

  console.log("[Service:createInternal] Task inserted with ID:", taskId);

  // 4. GENERATE ALL INSTANCES FOR 1 YEAR + SYNC SCHEDULE
  const firstInstanceId = await Instances.generateSeries(ctx, taskId, now);
  
  // The schedule sync service will automatically find and schedule the 
  // FIRST relevant upcoming instance based on the new data state.
  await syncTaskSchedule(ctx, taskId);

  // ═══════════════════════════════════════════════════════════════════════
  // 5. ATOMIC PRESET REFRESH — Maintain "Latest Accountability Identity"
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * PRODUCTION RATIONALE: "The Last Known Good"
   * The user wants the app to always remember their *most recent* penalty style.
   * To keep the DB clean and the UI simple, we enforce a 'Single Preset' rule:
   * 1. Wipe all old presets for this user.
   * 2. Insert the current configuration as the new source of truth.
   */
  if (args.penalty) {
    try {
      // 1. Fetch all existing presets for this user
      const oldPresets = await ctx.db
        .query("accountabilityPresets")
        .withIndex("by_userId", (q) => q.eq("userId", args.assignee_id))
        .collect();

      // 2. Clear the slate (Atomic Cleanup)
      for (const preset of oldPresets) {
        await ctx.db.delete(preset._id);
      }

      // 3. Register the new "Accountability Identity"
      await ctx.db.insert("accountabilityPresets", {
        userId: args.assignee_id,
        penalty: args.penalty, // CLEAN template (storageId, no transient URLs)
        penalty_waiver: args.penalty_waiver,
        last_used_at: now,
        usage_count: (oldPresets[0]?.usage_count || 0) + 1, // Carry over momentum
      });
      
      console.log(`[Service:createInternal] Accountability Identity refreshed for user ${args.assignee_id}`);
    } catch (presetError) {
      console.error("[Service:createInternal] Non-critical identity refresh failed:", presetError);
    }
  }

  return { taskId };
}

export type UpdateArgs = {
  id: Id<"tasks">;
  title?: string;
  description?: string;
  visibility?: Doc<"tasks">["visibility"];
  recurrence?: any;
  conditions?: any[];
  penalty?: Doc<"tasks">["penalty"];
  penalty_waiver?: Doc<"tasks">["penalty_waiver"];
  config?: Doc<"tasks">["config"];
  user_id: string; // For authorization check inside logic if needed, or API handles it.
};

/**
 * Core business logic for updating a commitment.
 * 
 * Handles partial updates and side effects:
 * 1. Verifies existence and ownership (Assigner Only).
 * 2. Re-validates domain rules if relevant fields change.
 * 3. Checks for conflicts if recurrence is updated.
 * 4. Updates the task record.
 * 5. If schedule changes (recurrence), it performs a "Reschedule":
 *    - Cleans up future instances of the old schedule.
 *    - Generates new instances based on the new schedule.
 * 
 * @throws Error [TASK_NOT_FOUND], [UNAUTHORIZED], [SCHEDULE_CONFLICT]
 */
export async function updateInternal(ctx: MutationCtx, args: UpdateArgs) {
  const { id, user_id, ...updates } = args;

  // 1. Fetch
  const existingTask = await ctx.db.get(id);
  // Explicitly check for null and type narrowing happens automatically if id is Id<"tasks">
  if (!existingTask) throw new Error("[TASK_NOT_FOUND] Task not found");

  // 2. Authorization (Double check or rely on API? Safe to check here too for "Secure by Default")
  if (existingTask.assigner_id !== user_id) {
    throw new Error("[UNAUTHORIZED] Permission denied");
  }

  // 3. Validate
  if (
    updates.title !== undefined || 
    updates.recurrence !== undefined || 
    updates.conditions !== undefined ||
    updates.penalty !== undefined ||
    updates.penalty_waiver !== undefined
  ) {
    const validation = validateCommitment({
      title: updates.title ?? existingTask.title,
      recurrence: updates.recurrence ?? existingTask.recurrence,
      conditions: updates.conditions ?? existingTask.conditions,
      assigner_id: existingTask.assigner_id,
      assignee_id: existingTask.assignee_id,
      penalty: updates.penalty ?? (updates.penalty === null ? undefined : existingTask.penalty),
      penalty_waiver: updates.penalty_waiver ?? (updates.penalty_waiver === null ? undefined : existingTask.penalty_waiver),
    });
    if (!validation.valid) throw new Error(`[${validation.errorCode}] ${validation.error}`);
  }

  // 4. Conflict Check
  if (updates.recurrence) {
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_assignee_id", (q) => q.eq("assignee_id", existingTask.assignee_id))
      .collect();

    const conflictResult = findConflict({
      _id: id,
      assignee_id: existingTask.assignee_id,
      title: updates.title ?? existingTask.title,
      recurrence: updates.recurrence,
    }, allTasks, id);

    if (conflictResult.hasConflict) throw new Error(`[SCHEDULE_CONFLICT] ${formatConflictMessage(conflictResult.details)}`);
  }

  // 4. RESOLVE PENALTY PHOTO URL (IF UPDATED)
  // If the penalty is being updated and includes a storageId, we must resolve
  // the permanent HTTPS public URL now so that all future instances (snapshotted)
  // have a direct URL to display in the UI.
  if (updates.penalty?.type === "embarrassing_photo" && updates.penalty?.config?.storageId) {
    const photoUrl = await ctx.storage.getUrl(updates.penalty.config.storageId);
    if (photoUrl) {
      updates.penalty = {
        ...updates.penalty,
        config: {
          ...updates.penalty.config,
          photoUrl,
        },
      };
      console.log("[Service:updateInternal] Penalty photo URL resolved for update:", photoUrl);
    }
  }

  // 5. Update DB
  await ctx.db.patch(id, { ...updates, updated_at: Date.now() });

  // 6. Reschedule: Clean up old instances, regenerate for 1 year, and sync the next alarm
  await Instances.cleanupFuture(ctx, id);
  await Instances.generateSeries(ctx, id);

  // Triggers the centralized brain to find the next valid temporal slot
  await syncTaskSchedule(ctx, id);

  // ═══════════════════════════════════════════════════════════════════════
  // 7. ATOMIC PRESET REFRESH — Update "Latest Accountability Identity"
  // ═══════════════════════════════════════════════════════════════════════
  /**
   * REASONING: An update to a task is an update to the user's commitment style.
   * We wipe the old preset and store the latest one.
   */
  const cleanPenalty = args.penalty;
  const cleanWaiver = args.penalty_waiver;

  if (cleanPenalty) {
    try {
      const now = Date.now();
      const userId = existingTask.assignee_id;

      // 1. Fetch all existing presets for this user
      const oldPresets = await ctx.db
        .query("accountabilityPresets")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();

      // 2. Clear the slate
      for (const preset of oldPresets) {
        await ctx.db.delete(preset._id);
      }

      // 3. Register the new identity
      await ctx.db.insert("accountabilityPresets", {
        userId,
        penalty: cleanPenalty,
        penalty_waiver: cleanWaiver,
        last_used_at: now,
        usage_count: (oldPresets[0]?.usage_count || 0) + 1,
      });

      console.log(`[Service:updateInternal] Accountability Identity refreshed on task update for ${userId}`);
    } catch (presetError) {
      console.error("[Service:updateInternal] Failed to refresh preset during update:", presetError);
    }
  }
}

/**
 * Core business logic for deleting a commitment.
 * 
 * Performs a clean deletion:
 * 1. Verify ownership.
 * 2. Cancels any scheduled jobs and deletes future instances.
 * 3. Deletes the task definition itself.
 * 
 * Note: Past instances are preserved for history validation.
 */
export async function removeInternal(ctx: MutationCtx, args: { id: Id<"tasks">, user_id: string }) {
  const task = await ctx.db.get(args.id);
  if (!task) return;

  if (task.assigner_id !== args.user_id) throw new Error("[UNAUTHORIZED] Permission denied");

  // 1. Clean up all future instances + cancel any active scheduled job
  await Instances.cleanupFuture(ctx, args.id);
  
  // 2. Delete the task itself
  await ctx.db.delete(args.id);
}

/**
 * THE STEEL VAULT — Activation Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Transitions a task and its future occurrences into a "Strict Mode" state.
 * 
 * DESIGN PHILOSOPHY:
 * Strict Mode is a "one-way trust" mechanism. Once activated, the user
 * voluntarily surrenders their ability to edit or delete the commitment
 * for a specific duration.
 * 
 * ENFORCEMENT STRATEGY:
 * 1. Master Rule: The `tasks` table stores the global `strict_until` timestamp.
 *    Any future generation cycles (Expansion) will respect this.
 * 2. Instance Locking: Every existing future instance within the timeframe is 
 *    individually patched with `strict_until = instance.end`. This creates 
 *    the "Vault Effect" — as long as the temporal slot hasn't passed, 
 *    the data is immutable.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function activateStrictModeInternal(
  ctx: MutationCtx, 
  args: { 
    id: Id<"tasks">; 
    user_id: string; 
    durationDays: number;
  }
) {
  const { id, user_id, durationDays } = args;

  // 1. Ownership Verification (Secure by Default)
  const task = await ctx.db.get(id);
  if (!task) throw new Error("[TASK_NOT_FOUND] Cannot lock a non-existent task.");
  if (task.assigner_id !== user_id) throw new Error("[UNAUTHORIZED] Only the assigner can activate Strict Mode.");

  // 2. Calculate Temporal Boundary
  // If already locked, we EXTEND from the current lock end.
  // Otherwise, we ACTIVATE from this very moment.
  const now = Date.now();
  const baseTime = (task.strict_until && task.strict_until > now) 
    ? task.strict_until 
    : now;

  const strictUntil = baseTime + (durationDays * 24 * 60 * 60 * 1000);
  const totalDays = Math.ceil((strictUntil - now) / (24 * 60 * 60 * 1000));

  // 3. Mark Master Rule
  // This ensures series regeneration (automatic or manual) inherits the lock.
  await ctx.db.patch(id, {
    strict_until: strictUntil,
    strict_duration_days: durationDays,
    updated_at: now,
  });

  console.log(`[STRICT_MODE] Master task ${id} locked until ${new Date(strictUntil).toISOString()}`);

  // 4. Retroactive Instance Enforcement
  // We fetch all "In-Flight" and "Future" occurrences to apply the vault seal.
  const instances = await ctx.db
    .query("taskInstances")
    .withIndex("by_task", (q) => q.eq("task_id", id))
    .collect();

  let lockedCount = 0;
  for (const inst of instances) {
    // We only lock instances that BEGIN before the strict window expires.
    // If a task starts on Day 6 and Strict Mode is for 7 days, it gets locked.
    if (inst.start < strictUntil && inst.status === "pending") {
      await ctx.db.patch(inst._id, {
        strict_until: inst.end, // Lock until the specific slot is completed
        is_manual_edit: true,   // Protect from generic rescheduling purges
      });
      lockedCount++;
    }
  }
  // 5. Fetch Final State for Sync
  const updatedInstances = await ctx.db
    .query("taskInstances")
    .withIndex("by_task", (q) => q.eq("task_id", id))
    .collect();

  console.log(`[STRICT_MODE] Successfully sealed ${lockedCount} instances in the Steel Vault.`);
  
  return { 
    success: true, 
    strictUntil, 
    lockedCount,
    instances: updatedInstances 
  };
}

