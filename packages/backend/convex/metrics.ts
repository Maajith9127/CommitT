import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  relationEnum,
  targetTypeEnum,
  permissionEnum,
} from "./enums";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("metrics").collect();
  },
});

export const get = query({
  args: { id: v.id("metrics") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByKey = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query("metrics")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .collect();
    return metrics[0] || null;
  },
});

export const create = mutation({
  args: {
    key: v.string(),
    name: v.string(),
    description: v.string(),
    unit: v.string(),
    allowed_relations: v.array(relationEnum),
    allowed_target_types: v.array(targetTypeEnum),
    permissions_required: v.array(permissionEnum),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("metrics", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("metrics"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    unit: v.optional(v.string()),
    allowed_relations: v.optional(v.array(relationEnum)),
    allowed_target_types: v.optional(v.array(targetTypeEnum)),
    permissions_required: v.optional(v.array(permissionEnum)),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("metrics") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
