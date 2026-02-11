import { v } from "convex/values";
import { internalMutation, MutationCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Doc, Id } from "../../_generated/dataModel";
import { generateTimeSlots } from "../../core/commitments/instanceGenerator";

/**
 * createAllInstances
 * ==========================================
 * Generates ALL task instances for the next 1 year and inserts them as
 * DB records, linked together via next_instance_id (linked-list chain).
 * 
 * Returns the ID of the FIRST instance, or null if no slots found.
 */
export async function createAllInstances(
  ctx: MutationCtx,
  taskId: Id<"tasks">,
  fromTime: number = Date.now(),
): Promise<Id<"taskInstances"> | null> {
  // 1. Fetch the task to get recurrence rules and snapshot data
  const task = await ctx.db.get(taskId);
  if (!task) {
    console.log(`[createAllInstances] Task ${taskId} not found.`);
    return null;
  }

  // 2. Build recurrence config
  const recurrence = task.recurrence;

  // TODO: Get timezone from user profile. Defaulting to IST (330 minutes) for now.
  const timezoneOffset = 330;

  // 3. Generate all time slots for the next year
  const slots = generateTimeSlots(recurrence, fromTime, timezoneOffset);

  if (slots.length === 0) {
    console.log(`[createAllInstances] No slots generated for task ${taskId}.`);
    return null;
  }

  console.log(`[createAllInstances] Generating ${slots.length} instances for task ${taskId}`);

  // 4. Insert all instances (without next_instance_id first)
  const instanceIds: Id<"taskInstances">[] = [];

  for (const slot of slots) {
    const instanceId = await ctx.db.insert("taskInstances", {
      task_id: taskId,
      assignee_id: task.assignee_id,
      status: "pending",
      start: slot.startTime,
      end: slot.endTime,
      title: task.title,
      description: task.description,
      recurrence: recurrence,
      conditions: task.conditions,
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

  console.log(`[createAllInstances] Created ${instanceIds.length} instances. First: ${instanceIds[0]}, Last: ${instanceIds[instanceIds.length - 1]}`);

  return instanceIds[0];
}

/**
 * scheduleFirstInstance
 * ==========================================
 * Schedules the verification job for a given instance.
 * This is used to kick off the chain — only 1 scheduled function at a time.
 */
export async function scheduleFirstInstance(
  ctx: MutationCtx,
  instanceId: Id<"taskInstances">,
) {
  const instance = await ctx.db.get(instanceId);
  if (!instance) {
    console.log(`[scheduleFirstInstance] Instance ${instanceId} not found.`);
    return;
  }

  console.log(`[scheduleFirstInstance] Scheduling verification for ${instance.title} at ${new Date(instance.end).toISOString()}`);

  // Schedule verification to run at the END of this instance's time slot
  const scheduledJobId = await ctx.scheduler.runAt(
    instance.end,
    internal.execution.verification.runner.runVerification,
    { instanceId, taskTitle: instance.title },
  );

  // Link the job ID for cancellation
  await ctx.db.patch(instanceId, { scheduled_job_id: scheduledJobId });
}
