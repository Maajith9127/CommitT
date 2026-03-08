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

  // 5. Update DB
  await ctx.db.patch(id, { ...updates, updated_at: Date.now() });

  // 6. Reschedule: Clean up old instances, regenerate for 1 year, and sync the next alarm
  await Instances.cleanupFuture(ctx, id);
  await Instances.generateSeries(ctx, id);

  // Triggers the centralized brain to find the next valid temporal slot
  await syncTaskSchedule(ctx, id);
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

