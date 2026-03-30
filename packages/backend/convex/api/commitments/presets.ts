import { query, mutation } from "../../_generated/server";
import { v } from "convex/values";

/**
 * PRODUCTION RATIONALE: "Zero-Friction Accountability"
 * Fetches the user's "Accountability Identity" — their most recently used 
 * penalty and waiver configuration. 
 */
export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const preset = await ctx.db
      .query("accountabilityPresets")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc") 
      .first();

    if (!preset) return null;

    let resolvedPenalty = preset.penalty;
    
    if (preset.penalty?.type === "embarrassing_photo" && preset.penalty?.config?.storageId) {
      const photoUrl = await ctx.storage.getUrl(preset.penalty.config.storageId);
      if (photoUrl) {
        resolvedPenalty = {
          ...preset.penalty,
          config: {
            ...preset.penalty.config,
            photoUrl,
          },
        };
      }
    }

    return {
      penalty: resolvedPenalty,
      penalty_waiver: preset.penalty_waiver,
    };
  },
});

/**
 * PRODUCTION RATIONALE: "Location Quick-Pick"
 */
export const getRecommendedLocations = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("locationPresets")
      .withIndex("by_userId_popularity", (q) => q.eq("userId", identity.subject))
      .order("desc") 
      .take(args.limit ?? 5);
  },
});

/**
 * PRODUCTION RATIONALE: "Habitual Application Blocklists"
 */
export const getRecommendedDigitalCommitments = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("digitalCommitmentPresets")
      .withIndex("by_userId_popularity", (q) => q.eq("userId", identity.subject))
      .order("desc") 
      .take(args.limit ?? 5);
  },
});

/**
 * PRODUCTION RATIONALE: "Cleanup Location presets"
 */
export const deleteLocationPreset = mutation({
  args: { id: v.id("locationPresets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * PRODUCTION RATIONALE: "Cleanup Digital presets"
 */
export const deleteDigitalPreset = mutation({
  args: { id: v.id("digitalCommitmentPresets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * PRODUCTION RATIONALE: "Smart Sorting - Popularity Boost"
 */
export const incrementLocationUsage = mutation({
  args: { id: v.id("locationPresets") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    
    await ctx.db.patch(args.id, {
      usage_count: (existing.usage_count || 0) + 1,
      last_used_at: Date.now(),
    });
  },
});

/**
 * PRODUCTION RATIONALE: "Smart Sorting - Popularity Boost"
 */
export const incrementDigitalUsage = mutation({
  args: { id: v.id("digitalCommitmentPresets") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    
    await ctx.db.patch(args.id, {
      usage_count: (existing.usage_count || 0) + 1,
      last_used_at: Date.now(),
    });
  },
});
