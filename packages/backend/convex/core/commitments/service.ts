
import { MutationCtx } from "../../_generated/server";
import { Id, Doc } from "../../_generated/dataModel";
import { findConflict, formatConflictMessage } from "../../lib/conflictDetection";
import { scheduleNextInstance } from "../../execution/scheduling/scheduler";
import { validateCommitment } from "./validator";

export type CreateArgs = {
  assignee_id: string;
  title: string;
  description: string;
  visibility: Doc<"tasks">["visibility"];
  recurrence: any;
  conditions: any[];
  assigner_id: string; // Passed from API layer after auth
};

export async function createInternal(ctx: MutationCtx, args: CreateArgs) {
  // 1. VALIDATE INPUT (Domain Logic)
  const validation = validateCommitment({
    title: args.title,
    recurrence: args.recurrence,
    conditions: args.conditions,
    assigner_id: args.assigner_id,
    assignee_id: args.assignee_id,
  });

  if (!validation.valid) {
    throw new Error(`[${validation.errorCode}] ${validation.error}`);
  }

  // 2. CHECK CONFLICTS
  const existingTasks = await ctx.db
    .query("tasks")
    .withIndex("by_assignee_id", (q) => q.eq("assignee_id", args.assignee_id))
    .collect();

  const conflictResult = findConflict({
    assignee_id: args.assignee_id,
    title: args.title,
    recurrence: args.recurrence,
  }, existingTasks);

  if (conflictResult.hasConflict) {
    throw new Error(`[SCHEDULE_CONFLICT] ${formatConflictMessage(conflictResult.details)}`);
  }

  // 3. INSERT INTO DB
  const now = Date.now();
  const taskId = await ctx.db.insert("tasks", {
    assignee_id: args.assignee_id,
    title: args.title,
    description: args.description,
    visibility: args.visibility,
    recurrence: args.recurrence,
    conditions: args.conditions,
    assigner_id: args.assigner_id,
    created_at: now,
    updated_at: now,
  });

  // 4. SCHEDULE EXECUTION
  await scheduleNextInstance(ctx, taskId, now);

  return { taskId };
}

export type UpdateArgs = {
  id: Id<"tasks">;
  title?: string;
  description?: string;
  visibility?: Doc<"tasks">["visibility"];
  recurrence?: any;
  conditions?: any[];
  user_id: string; // For authorization check inside logic if needed, or API handles it.
};

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
  if (updates.title !== undefined || updates.recurrence || updates.conditions) {
    const validation = validateCommitment({
      title: updates.title ?? existingTask.title,
      recurrence: updates.recurrence ?? existingTask.recurrence,
      conditions: updates.conditions ?? existingTask.conditions,
      assigner_id: existingTask.assigner_id,
      assignee_id: existingTask.assignee_id,
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

  // 6. Reschedule
  await cleanupPendingInstances(ctx, id);
  await scheduleNextInstance(ctx, id);
}

export async function removeInternal(ctx: MutationCtx, args: { id: Id<"tasks">, user_id: string }) {
  const task = await ctx.db.get(args.id);
  if (!task) return;

  if (task.assigner_id !== args.user_id) throw new Error("[UNAUTHORIZED] Permission denied");

  await cleanupPendingInstances(ctx, args.id);
  await ctx.db.delete(args.id);
}

async function cleanupPendingInstances(ctx: MutationCtx, taskId: Id<"tasks">) {
  const pendingInstances = await ctx.db
    .query("taskInstances")
    .withIndex("by_task_status", (q) => q.eq("task_id", taskId).eq("status", "pending"))
    .collect();

  for (const instance of pendingInstances) {
    if (instance.scheduled_job_id) {
       await ctx.scheduler.cancel(instance.scheduled_job_id);
    }
    await ctx.db.delete(instance._id);
  }
}
