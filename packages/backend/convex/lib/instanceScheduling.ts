
import { v } from "convex/values";
import { internalMutation, MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { findNextTimeSlot } from "./scheduling";

/**
 * scheduleNextInstance
 * ==========================================
 * This is the CORE of the "Verification Chain".
 * 
 * It performs 3 atomic steps:
 * 1. Calculates the NEXT time slot for this task.
 * 2. Creates a "Pending" TaskInstance for that slot (Snapshotting rules).
 * 3. Schedules the 'runScheduledCheck' to run at the end of that slot.
 * 
 * @param ctx - Mutation Context
 * @param taskId - The parent task ID
 * @param fromTime - (Optional) When to start looking for the next slot. Defaults to Now.
 */
export async function scheduleNextInstance(
  ctx: MutationCtx,
  taskId: Id<"tasks">,
  fromTime: number = Date.now()
) {
  // 1. Fetch the Parent Task to get the Rules
  const task = await ctx.db.get(taskId);
  if (!task) {
    console.log(`[scheduleNextInstance] Task ${taskId} not found. Stopping chain.`);
    return;
  }

  // 2. Calculate Next Time Slot
  // We need to map the DB recurrence schema to the helper's expected type
  const recurrenceConfig = {
    type: task.recurrence.type as any,
    interval: task.recurrence.interval,
    days_of_week: task.recurrence.days_of_week,
    time_windows: task.recurrence.time_windows,
    ends: task.recurrence.ends as any,
  };

  // TODO: Get timezone from user profile. defaulting to IST (330 minutes) for now.
  const timezoneOffset = 330; 
  const nextSlot = findNextTimeSlot(recurrenceConfig, fromTime, timezoneOffset);

  if (!nextSlot) {
    console.log(`[scheduleNextInstance] No future slots found for ${taskId}. End of chain.`);
    return;
  }

  console.log(`[scheduleNextInstance] Scheduling next for ${taskId} at ${new Date(nextSlot.startTime).toISOString()}`);

  // 3. Create the "Pending" Instance (Snapshotting everything)
  const instanceId = await ctx.db.insert("taskInstances", {
    task_id: taskId,
    assignee_id: task.assignee_id,
    status: "pending",
    start: nextSlot.startTime,
    end: nextSlot.endTime,
    
    // SNAPSHOT: Copy rules from Parent -> Child
    title: task.title,
    description: task.description,
    recurrence: task.recurrence,
    conditions: task.conditions,
  });

  // 4. Schedule the Verification Check (The "Spark")
  // We pass the instanceId so the scheduler knows EXACTLY what to verify.
  const scheduledJobId = await ctx.scheduler.runAt(
    nextSlot.endTime,
    internal.tasks.runScheduledCheck,
    { instanceId }
  );

  // 5. Link the Job ID (For cancellation)
  await ctx.db.patch(instanceId, { scheduled_job_id: scheduledJobId });
  
  return instanceId;
}
