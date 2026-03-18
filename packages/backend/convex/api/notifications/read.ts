import { authedQuery } from "../../middleware";
import { v } from "convex/values";

export const getGroups = authedQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { user } = ctx;
    
    // SIMPLIFIED STEP 1
    console.log(`\n\n🎯 [NOTIFICATIONS ROUTE HIT] 🎯`);
    console.log(`===============================================`);
    console.log(`➡️  Query requested by User ID: ${user._id}`);
    
    // 1. Fetch strictly pending scheduler jobs
    const rawSystemJobs = await ctx.db.system.query("_scheduled_functions").collect();
    const pendingDashboardJobs = rawSystemJobs.filter((job: any) => job.state && job.state.kind === "pending");

    // LOG EXPLICIT PENDING EVENTS
    console.log(`\n\n================ [PENDING EVENTS LOG] ================`);
    pendingDashboardJobs.forEach((job: any, index: number) => {
       const args = Array.isArray(job.args) ? job.args[0] : job.args;
       console.log(`[Job ${index + 1}] ID: ${job._id}`);
       console.log(`          Function: ${job.name}`);
       console.log(`          Targets Instance: ${args?.instanceId || "None/Unknown"}`);
       console.log(`          Scheduled For: ${new Date(job.scheduledTime).toLocaleString()}`);
    });
    console.log(`======================================================\n\n`);

    // 2. Extract Instance IDs strictly based on function names!
    const upcomingIds = new Map<string, number>();
    const waiverIds = new Map<string, number>();

    for (const job of pendingDashboardJobs) {
       const jobArgs = Array.isArray(job.args) ? job.args[0] : job.args;
       if (jobArgs && typeof jobArgs === "object" && jobArgs.instanceId) {
          // If this is an enforcement bomb, put it in waivers
          if (job.name.includes("firePenalty") || job.name.includes("enforcement")) {
             waiverIds.set(jobArgs.instanceId, job.scheduledTime);
          } 
          // Otherwise, it's a verification (Upcoming)
          else {
             upcomingIds.set(jobArgs.instanceId, job.scheduledTime);
          }
       }
    }

    const upcoming = [];
    const action_required = [];

    // 3. TARGETED DATABASE LOCK: Bypass mass arrays completely!
    // Using simple ctx.db.get(id) enforces a hard reality check exactly against the DB.
    for (const [id, scheduledTime] of upcomingIds.entries()) {
       const inst: any = await ctx.db.get(id as any);
       if (inst && inst.assignee_id === user._id) {
          upcoming.push({ ...inst, _live_schedule_time: scheduledTime });
       } else if (!inst) {
          console.error(`🚨 [GHOST JOB DETECTED] Scheduled Verification exists for DELETED Instance ID: ${id}`);
       }
    }

    for (const [id, scheduledTime] of waiverIds.entries()) {
       const inst: any = await ctx.db.get(id as any);
       if (inst && inst.assignee_id === user._id) {
          action_required.push({ ...inst, _live_schedule_time: scheduledTime });
       } else if (!inst) {
          console.error(`🚨 [GHOST JOB DETECTED] FirePenalty bomb exists for DELETED Instance ID: ${id}`);
       }
    }

    // Output definitive result mapping
    console.log(`[DEBUG] Final Arrays -> Upcoming: ${upcoming.length}, Waivers: ${action_required.length}`);

    // Sort chronologically: Nearest deadlines first, furthest future deadlines last
    // Using the absolute Cron execution payload _live_schedule_time to map exactly when it expires
    upcoming.sort((a: any, b: any) => (a._live_schedule_time || a.end) - (b._live_schedule_time || b.end));
    action_required.sort((a: any, b: any) => (a._live_schedule_time || a.end) - (b._live_schedule_time || b.end));

    return {
      upcoming,
      action_required,
      verified: [],
    };
  },
});
