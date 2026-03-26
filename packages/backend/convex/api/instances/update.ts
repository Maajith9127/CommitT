import { v } from "convex/values";
import { authedMutation } from "../../middleware";
import { Id, Doc } from "../../_generated/dataModel";
import { Instances } from "../../core/instances/service";
import { formatDate, formatTimeRange } from "../../lib/formatters";
import { syncTaskSchedule } from "../../execution/scheduling/scheduler";
import { evaluateGradingVerdict } from "../../execution/verification/runner";

/**
 * Update an existing task instance.
 * Allows updating status (e.g. "completed", "skipped") or other mutable fields.
 * 
 * DESIGN RATIONALE: We use the 'force: true' sync here to ensure that manual
 * time edits (drag-and-drop) immediately update the backend alarm time.
 */
export const update = authedMutation({
  args: {
    id: v.id("taskInstances"),
    status: v.optional(v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"), v.literal("skipped"), v.literal("proceeding"), v.literal("proceeded"))),
    start: v.optional(v.number()),
    end: v.optional(v.number()),
    strict_until: v.optional(v.number()),
    is_manual_edit: v.optional(v.boolean()),
    conditions: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const { user } = ctx;

    const instance = (await ctx.db.get(id)) as Doc<"taskInstances"> | null;
    if (!instance) {
      throw new Error("[INSTANCE_NOT_FOUND] Instance not found");
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // THE STEEL GATE — Strict Mode Enforcement
    // ─────────────────────────────────────────────────────────────────────────────
    if (instance.strict_until && Date.now() < instance.strict_until) {
      console.warn(`[CONVEX_UPDATE] REJECTED: Instance ${id} is locked until ${new Date(instance.strict_until).toISOString()}`);
      return { 
        success: false, 
        error: "STRICT_LOCK_ACTIVE", 
        message: "This instance is locked and cannot be modified." 
      };
    }

    if (instance.assignee_id !== user._id) {
      throw new Error("[UNAUTHORIZED] You can only update your own instances");
    }

    console.log(`[CONVEX_UPDATE] Updating Instance: ${id}`);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // FEATURE: Collision Detection
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

    // CRITICAL: Synchronize the schedule brain with 'force: true' to honor time shifts.
    await syncTaskSchedule(ctx, instance.task_id, true);

    const updatedInstance = await ctx.db.get(id);

    console.log(`[CONVEX_UPDATE] TRANSACTION_COMPLETE: Returning authoritative state for ${id}`);

    return { 
      success: true,
      instance: updatedInstance
    };
  },
});
