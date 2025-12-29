import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  relationEnum,
  targetTypeEnum,
  visibilityEnum,
  taskStatusEnum,
} from "./enums";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});

export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByAssignee = query({
  args: { assignee_id: v.id("user") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_assignee_id", (q) => q.eq("assignee_id", args.assignee_id))
      .collect();
  },
});

export const listByAssigner = query({
  args: { assigner_id: v.id("user") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_assigner_id", (q) => q.eq("assigner_id", args.assigner_id))
      .collect();
  },
});

export const listByStatus = query({
  args: { status: taskStatusEnum },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

export const create = mutation({
  args: {
    assigner_id: v.id("user"),
    assignee_id: v.id("user"),
    title: v.string(),
    description: v.string(),
    visibility: visibilityEnum,
    time_window: v.object({
      start_at: v.number(),
      due_at: v.number(),
    }),
    conditions: v.array(
      v.object({
        metric_key: v.string(),
        relation: relationEnum,
        target: v.object({
          type: targetTypeEnum,
          value: v.any(),
        }),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("tasks", {
      ...args,
      status: "pending",
      created_at: now,
      updated_at: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(visibilityEnum),
    time_window: v.optional(
      v.object({
        start_at: v.number(),
        due_at: v.number(),
      }),
    ),
    conditions: v.optional(
      v.array(
        v.object({
          metric_key: v.string(),
          relation: relationEnum,
          target: v.object({
            type: targetTypeEnum,
            value: v.any(),
          }),
        }),
      ),
    ),
    status: v.optional(taskStatusEnum),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      updated_at: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: taskStatusEnum,
  },
  handler: async (ctx, args) => {
    const { id, status } = args;
    return await ctx.db.patch(id, {
      status,
      updated_at: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
