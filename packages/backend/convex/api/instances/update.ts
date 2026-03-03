import { v } from "convex/values";
import { authedMutation } from "../../middleware";
import { Id, Doc } from "../../_generated/dataModel";
import { Instances } from "../../core/instances/service";
import { formatDate, formatTimeRange } from "../../lib/formatters";
import { syncTaskSchedule } from "../../execution/scheduling/scheduler";

/**
 * Update an existing task instance.
 * Allows updating status (e.g. "completed", "skipped") or other mutable fields.
 */
export const update = authedMutation({
  args: {
    id: v.id("taskInstances"),
    status: v.optional(v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"), v.literal("skipped"), v.literal("proceeding"), v.literal("proceeded"))),
    start: v.optional(v.number()),
    end: v.optional(v.number()),
    // Add other updateable fields here as needed
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const { user } = ctx;

    const instance = (await ctx.db.get(id)) as Doc<"taskInstances"> | null;
    if (!instance) {
      throw new Error("[INSTANCE_NOT_FOUND] Instance not found");
    }

    if (instance.assignee_id !== user._id) {
      throw new Error("[UNAUTHORIZED] You can only update your own instances");
    }

    console.log(`[CONVEX_UPDATE] Updating Instance: ${id}`);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // FEATURE: Collision Detection (Schedule Overlap Validation)
    // ─────────────────────────────────────────────────────────────────────────────
    const proposedStart = updates.start ?? instance.start;
    const proposedEnd = updates.end ?? instance.end;

    if (updates.start !== undefined || updates.end !== undefined) {
      const overlap = await Instances.checkOverlap(ctx, {
        assignee_id: user._id,
        start: proposedStart,
        end: proposedEnd,
        exclude_id: id,
      });

      if (overlap) {
        const timeRange = formatTimeRange(overlap.start, overlap.end);
        const dateStr = formatDate(overlap.start);
        
        console.warn(`[CONVEX_UPDATE] COLLISION_DETECTED: Overlaps with "${overlap.title}" on ${dateStr} (${timeRange})`);
        
        return { 
          success: false, 
          error: "OVERLAP_DETECTED", 
          message: `Conflicts with "${overlap.title}" on ${dateStr} at ${timeRange}` 
        };
      }
    }

    console.log(`[CONVEX_UPDATE] COMMIT_CHANGE: Start=${proposedStart}, Status=${updates.status ?? instance.status}`);

    await Instances.update(ctx, id, updates);

    // CRITICAL: Synchronize the schedule brain
    // This ensures if we move an instance, the system automatically 
    // re-evaluates which alarm should be set next.
    await syncTaskSchedule(ctx, instance.task_id);

    // Fetch the final hydrated state to return to the client for local sync
    const updatedInstance = await ctx.db.get(id);

    console.log(`[CONVEX_UPDATE] TRANSACTION_COMPLETE: Returning authoritative state for ${id}`);

    return { 
      success: true,
      instance: updatedInstance
    };
  },
});
