import { query } from "../../_generated/server";
import { v } from "convex/values";

/**
 * PRODUCTION RATIONALE: "Zero-Friction Accountability"
 * Fetches the user's "Accountability Identity" — their most recently used 
 * penalty and waiver configuration. 
 * 
 * Used by the mobile app's pre-fill engine to "arm" the task creation draft 
 * before the user even types a title.
 */
export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const preset = await ctx.db
      .query("accountabilityPresets")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc") // We only have one, but desc ensures we get the latest if we ever allow multiple
      .first();

    if (!preset) return null;

    // ─────────────────────────────────────────────────────────────────────
    // AUTO-HEALING: Resolve Fresh Photo URL for the Draft Preview
    // ─────────────────────────────────────────────────────────────────────
    // If the preset contains a photo penalty, we resolve a fresh signed URL
    // so the draft in Zustand starts with a working preview immediately.
    // ─────────────────────────────────────────────────────────────────────
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
 * Fetches the user's most recently/frequently visited task locations.
 * Allows the UI to suggest "Home", "Office", or "Gym" without re-searching.
 */
export const getRecommendedLocations = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("locationPresets")
      .withIndex("by_userId_popularity", (q) => q.eq("userId", identity.subject))
      .order("desc") // Priority: Popularity first (Most used ones on top)
      .take(args.limit ?? 5);
  },
});

/**
 * PRODUCTION RATIONALE: "Habitual Application Blocklists"
 * Fetches saved groups of blocked apps. Instead of manually picking 
 * Instagram/Twitter every time, users can select their "Socials" preset.
 */
export const getRecommendedDigitalCommitments = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("digitalCommitmentPresets")
      .withIndex("by_userId_popularity", (q) => q.eq("userId", identity.subject))
      .order("desc") // Priority: Popularity first
      .take(args.limit ?? 5);
  },
});
