import { v } from "convex/values";
import { internalMutation, MutationCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Doc, Id } from "../../_generated/dataModel";
import { findNextTimeSlot } from "../../core/commitments/scheduler"; // Domain Logic

/**
 * scheduleNextInstance
 * ==========================================
 * This is the CORE of the "Verification Chain".
 * 
 * It performs 3 atomic steps:
 * 1. Calculates the NEXT time slot for this task.
 * 2. Creates a "Pending" TaskInstance for that slot (Snapshotting rules).
 * 3. Schedules the 'runVerification' to run at the end of that slot.
 */
export async function scheduleNextInstance(
  ctx: MutationCtx,
  taskId: Id<"tasks">,
  fromTime: number = Date.now(),
  previousRecurrenceState?: Doc<"tasks">["recurrence"]
) {
  // 1. Fetch the Parent Task to get the Rules (or use override base)
  const task = await ctx.db.get(taskId);
  if (!task) {
    console.log(`[scheduleNextInstance] Task ${taskId} not found. Stopping chain.`);
    return;
  }

  // Determine which recurrence config to use (Parent's or Chain's)
  const recurrenceToUse = previousRecurrenceState ?? task.recurrence;

  // 2. Cancellation Check: "Count" based
  if (recurrenceToUse.ends?.type === "after") {
    const currentCount = recurrenceToUse.ends.count ?? 0;
    if (currentCount <= 0) {
      console.log(`[scheduleNextInstance] Task ${taskId} reached recurrence limit. Stopping chain.`);
      return;
    }
  }

  // 3. Calculate Next Time Slot
  const recurrenceConfig = {
    type: recurrenceToUse.type as any,
    interval: recurrenceToUse.interval,
    days_of_week: recurrenceToUse.days_of_week,
    time_windows: recurrenceToUse.time_windows,
    ends: recurrenceToUse.ends as any,
  };

  // TODO: Get timezone from user profile. defaulting to IST (330 minutes) for now.
  const timezoneOffset = 330; 
  const nextSlot = findNextTimeSlot(recurrenceConfig, fromTime, timezoneOffset);

  if (!nextSlot) {
    console.log(`[scheduleNextInstance] No future slots found for ${taskId}. End of chain.`);
    return;
  }

  // 4. Cancellation Check: "Date" based
  if (recurrenceToUse.ends?.type === "on" && recurrenceToUse.ends.date) {
    if (nextSlot.startTime > recurrenceToUse.ends.date) {
        console.log(`[scheduleNextInstance] Task ${taskId} past end date. Stopping chain.`);
        return;
    }
  }

  console.log(`[scheduleNextInstance] Scheduling next for ${taskId} at ${new Date(nextSlot.startTime).toISOString()}`);

  // 5. Prepare Snapshot (Decrement count if needed)
  let snapshotRecurrence = { ...recurrenceToUse };
  
  if (recurrenceToUse.ends?.type === "after") {
     const currentCount = recurrenceToUse.ends.count ?? 0;
     snapshotRecurrence = {
        ...recurrenceToUse,
        ends: {
            ...recurrenceToUse.ends,
            count: Math.max(0, currentCount - 1) // Decrement for the NEXT child
        }
     };
  }

  // 6. Create the "Pending" Instance
  const instanceId = await ctx.db.insert("taskInstances", {
    task_id: taskId,
    assignee_id: task.assignee_id,
    status: "pending",
    start: nextSlot.startTime,
    end: nextSlot.endTime,
    
    // SNAPSHOT: Copy rules (using the possibly decremented version)
    title: task.title,
    description: task.description,
    recurrence: snapshotRecurrence,
    conditions: task.conditions,
  });

  // 7. Schedule the Verification Check (The "Spark")
  // We pass the instanceId so the scheduler knows EXACTLY what to verify.
  const scheduledJobId = await ctx.scheduler.runAt(
    nextSlot.endTime,
    internal.execution.verification.runner.runVerification, // POINTING TO NEW LOCATION
    { instanceId, taskTitle: task.title }
  );

  // 8. Link the Job ID (For cancellation)
  await ctx.db.patch(instanceId, { scheduled_job_id: scheduledJobId });
  
  return instanceId;
}
