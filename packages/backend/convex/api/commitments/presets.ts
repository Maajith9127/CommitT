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
 * PRODUCTION RATIONALE: "In-Place Preset Refinement"
 *
 * Allows authenticated users to update an existing location preset's
 * core properties (address, coordinates, radius) without destroying
 * usage history or creating duplicates.
 *
 * WHY NOT DELETE + Re-Create?
 *   Preserves the original `usage_count` and `_creationTime`, which feed
 *   into the "most-used" sorting algorithm on the Presets Hub. Deleting
 *   and recreating would reset this popularity signal to zero.
 *
 * SECURITY: Ownership is validated before any mutation is applied.
 */
export const updateLocationPreset = mutation({
  args: {
    id: v.id("locationPresets"),
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
    radius: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== identity.subject) {
      throw new Error("Unauthorized: Preset not found or access denied.");
    }

    await ctx.db.patch(args.id, {
      address: args.address,
      lat: args.lat,
      lng: args.lng,
      radius: args.radius,
      last_used_at: Date.now(),
    });

    return { success: true };
  },
});

/**
 * PRODUCTION RATIONALE: "Expressive Identity Creation"
 * 
 * Allows users to manually save a new location preset.
 * Automatically initializes usage signals (count=0) to ensure the sorting
 * algorithm treats it correctly.
 */
export const createLocationPreset = mutation({
  args: {
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
    radius: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const id = await ctx.db.insert("locationPresets", {
      userId: identity.subject,
      address: args.address,
      lat: args.lat,
      lng: args.lng,
      radius: args.radius,
      usage_count: 0,
      last_used_at: Date.now(),
    });

    return { success: true, id };
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
 * PRODUCTION RATIONALE: "Expressive Digital Commitments"
 *
 * Allows users to update an existing digital (app-blocklist) preset.
 */
export const updateDigitalPreset = mutation({
  args: {
    id: v.id("digitalCommitmentPresets"),
    apps: v.array(v.string()),
    websites: v.array(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== identity.subject) {
      throw new Error("Unauthorized: Preset not found or access denied.");
    }

    await ctx.db.patch(args.id, {
      apps: args.apps,
      websites: args.websites,
      name: args.name,
      last_used_at: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Allows users to manually save a new digital preset.
 */
export const createDigitalPreset = mutation({
  args: {
    apps: v.array(v.string()),
    websites: v.array(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const id = await ctx.db.insert("digitalCommitmentPresets", {
      userId: identity.subject,
      apps: args.apps,
      websites: args.websites,
      name: args.name,
      usage_count: 0,
      last_used_at: Date.now(),
    });

    return { success: true, id };
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

/**
 * PRODUCTION RATIONALE: "Expressive Behavioral DNA"
 */
export const getRecommendedRules = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("behavioralRulePresets")
      .withIndex("by_userId_popularity", (q) => q.eq("userId", identity.subject))
      .order("desc") 
      .take(args.limit ?? 10);
  },
});

export const deleteRulePreset = mutation({
  args: { id: v.id("behavioralRulePresets") },
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

export const createRulePreset = mutation({
  args: {
    name: v.string(),
    config: v.object({
      verification_style: v.string(),
      grace_period_minutes: v.number(),
      alarms: v.object({
        lead_time_minutes: v.number(),
        interval_minutes: v.number(),
        sound_key: v.string(),
      }),
      stay_throughout_config: v.optional(v.object({
        intensity: v.string(),
        max_missed_checkins: v.number(),
      })),
    }),
    penalty_waiver: v.optional(v.object({
      deadline_minutes: v.number(),
      allow_early: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const id = await ctx.db.insert("behavioralRulePresets", {
      userId: identity.subject,
      name: args.name,
      config: args.config as any,
      penalty_waiver: args.penalty_waiver,
      usage_count: 0,
      last_used_at: Date.now(),
    });

    return { success: true, id };
  },
});

export const updateRulePreset = mutation({
  args: {
    id: v.id("behavioralRulePresets"),
    name: v.string(),
    config: v.object({
      verification_style: v.string(),
      grace_period_minutes: v.number(),
      alarms: v.object({
        lead_time_minutes: v.number(),
        interval_minutes: v.number(),
        sound_key: v.string(),
      }),
      stay_throughout_config: v.optional(v.object({
        intensity: v.string(),
        max_missed_checkins: v.number(),
      })),
    }),
    penalty_waiver: v.optional(v.object({
      deadline_minutes: v.number(),
      allow_early: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== identity.subject) {
      throw new Error("Unauthorized: Preset not found or access denied.");
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      config: args.config as any,
      penalty_waiver: args.penalty_waiver,
      last_used_at: Date.now(),
    });

    return { success: true };
  },
});
