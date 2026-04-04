import { v } from "convex/values";
import { authedQuery } from "../../middleware";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PROD-LEVEL HYDRATION & RECONCILIATION ENGINE
 * ─────────────────────────────────────────────────────────────────────────────
 * Master sync endpoint for mobile clients ("Triple-Write" architecture).
 * When the React Native app boots, it provides its `last_synced_at` token.
 * 
 * SCENARIO A (Fresh Wipe / version 0): 
 * `last_synced_at` is null. The endpoint acts as a "Full Hydration Basin",
 * streaming all active tasks and all recent/future instances down to the device 
 * to completely rebuild the native SQLite cache and Kotlin Alarm layers.
 * 
 * SCENARIO B (Warm Boot): 
 * `last_synced_at` is provided. The endpoint acts as a "Delta Pipeline",
 * returning ONLY items that have been created or modified since the last boot.
 * 
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const getDeltaPayload = authedQuery({
  args: {
    last_synced_at: v.optional(v.number()), // Usually pulled from AsyncStorage
  },
  handler: async (ctx, args) => {
    const { user } = ctx;
    const ts = args.last_synced_at || 0;
    const currentServerTime = Date.now();

    // ─────────────────────────────────────────────────────────
    // 1. DELTA: Fetch Mutated Tasks
    // ─────────────────────────────────────────────────────────
    // Grabs tasks assigned to the user that were created or modified
    // AFTER the provided sync token.
    const mutatedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_assignee_id", (q) => q.eq("assignee_id", user._id))
      .filter((q) => q.gt(q.field("updated_at"), ts))
      .collect();

    // ─────────────────────────────────────────────────────────
    // 2. DELTA & HORIZON: Fetch Task Instances
    // ─────────────────────────────────────────────────────────
    // Since taskInstances are highly dynamic (e.g., status shifting 
    // from 'pending' to 'verified'), we utilize a Rolling Horizon.
    // We return ALL active instances from the last 7 days + futures, 
    // OR any brand new instances created strictly after the token.
    // The mobile SQLite 'Upsert' handles deduplication natively!
    const recentHorizon = currentServerTime - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    const instances = await ctx.db
      .query("taskInstances")
      .withIndex("by_assignee", (q) => q.eq("assignee_id", user._id))
      .filter((q) => 
        q.or(
           q.gt(q.field("_creationTime"), ts),
           q.gt(q.field("end"), recentHorizon)
        )
      )
      .collect();

    return {
      tasks: mutatedTasks,
      instances: instances,
      sync_token: currentServerTime // The new token the Mobile App must securely save
    };
  },
});
