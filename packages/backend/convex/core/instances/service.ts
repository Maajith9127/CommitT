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
  const instanceId = await ctx.db.insert("taskInstances", {
    task_id: args.task_id,
    assignee_id: args.assignee_id,
    status: args.status ?? "pending",
    start: args.start,
    end: args.end,
    title: args.title,
    description: args.description,
    recurrence: args.recurrence,
    conditions: args.conditions,
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
    .withIndex("by_task", (q) => q.eq("task_id", taskId))
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
