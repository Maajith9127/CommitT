import { authedQuery } from "../../middleware";
import { v } from "convex/values";

/**
 * Retrieves the user's task notifications organized by workflow state.
 *
 * @remarks
 * Temporary Dogfooding Implementation:
 * Currently scrapes the internal `_scheduled_functions` table to determine
 * which task instances have active pending jobs. This is inherently unscalable
 * for production as system tables lack user-scoped indices and involve O(N) 
 * full table scans over global execution queues.
 *
 * Production Migration Path:
 * 1. Replace the system table scan with a direct `taskInstances` query using
 *    `.withIndex("by_assignee")` scoped to the authenticated user.
 * 2. Filter states mathematically via the instance `status` property (e.g., 
 *    "pending", "waiver_active", "proceeded").
 * 3. Replace the dynamically injected `_live_schedule_time` with a computed
 *    expiry based on `instance.end` and `penalty_waiver.deadline_minutes`.
 */
export const getGroups = authedQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { user } = ctx;

    // Retrieve global scheduled functions and filter for active jobs.
    // Migration: Replace with `ctx.db.query("taskInstances").withIndex(...)`.
    const rawSystemJobs = await ctx.db.system.query("_scheduled_functions").collect();
    const pendingJobs = rawSystemJobs.filter(
      (job: any) => job.state && job.state.kind === "pending"
    );

    // Map scheduled function arguments to their exact execution intent.
    // `runVerification` -> Upcoming 
    // `firePenalty` -> Action Required (Waiver)
    const upcomingIds = new Map<string, number>();
    const waiverIds = new Map<string, number>();

    for (const job of pendingJobs) {
      const jobArgs = Array.isArray(job.args) ? job.args[0] : job.args;
      if (jobArgs && typeof jobArgs === "object" && jobArgs.instanceId) {
        if (job.name.includes("firePenalty") || job.name.includes("enforcement")) {
          waiverIds.set(jobArgs.instanceId, job.scheduledTime);
        } else {
          upcomingIds.set(jobArgs.instanceId, job.scheduledTime);
        }
      }
    }

    const upcoming = [];
    const action_required = [];

    // Directly query database instances referenced by the system queue.
    // Explicit validation is performed against the authenticated user ID.
    for (const [id, scheduledTime] of upcomingIds.entries()) {
      const inst: any = await ctx.db.get(id as any);
      if (inst && inst.assignee_id === user._id) {
        upcoming.push({ ...inst, _live_schedule_time: scheduledTime });
      } else if (!inst) {
        console.error(`[Orphaned Schedule] Verification targets deleted instance ID: ${id}`);
      }
    }

    for (const [id, scheduledTime] of waiverIds.entries()) {
      const inst: any = await ctx.db.get(id as any);
      if (inst && inst.assignee_id === user._id) {
        action_required.push({ ...inst, _live_schedule_time: scheduledTime });
      } else if (!inst) {
        console.error(`[Orphaned Schedule] Enforcement targets deleted instance ID: ${id}`);
      }
    }

    // Sort payloads strictly by chronological urgency (nearest expiring first).
    upcoming.sort(
      (a: any, b: any) => (a._live_schedule_time || a.end) - (b._live_schedule_time || b.end)
    );
    action_required.sort(
      (a: any, b: any) => (a._live_schedule_time || a.end) - (b._live_schedule_time || b.end)
    );

    return {
      upcoming,
      action_required,
      verified: [],
    };
  },
});
