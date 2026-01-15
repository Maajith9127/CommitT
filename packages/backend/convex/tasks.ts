import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { relationEnum, targetTypeEnum, visibilityEnum, taskStatusEnum, recurrenceTypeEnum, recurrenceEndsTypeEnum } from "./enums";
import { generateTaskConditions } from "./opencode";
import { internal } from "./_generated/api";

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
  args: { assignee_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_assignee_id", (q) => q.eq("assignee_id", args.assignee_id))
      .collect();
  },
});

export const listByAssigner = query({
  args: { assigner_id: v.string() },
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
    assigner_id: v.string(),
    assignee_id: v.string(),
    title: v.string(),
    description: v.string(),
    visibility: visibilityEnum,
    recurrence: v.object({
      type: recurrenceTypeEnum,
      interval: v.number(),
      days_of_week: v.optional(v.array(v.number())),
      ends: v.optional(v.object({
        type: recurrenceEndsTypeEnum,
        count: v.optional(v.number()),
        date: v.optional(v.number()),
      })),
    }),
    conditions: v.array(
      v.object({
        metric_key: v.string(),
        component: v.optional(v.string()),
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

export const createInternal = internalMutation({
  args: {
    assigner_id: v.string(),
    assignee_id: v.string(),
    title: v.string(),
    description: v.string(),
    visibility: visibilityEnum,
    recurrence: v.object({
      type: recurrenceTypeEnum,
      interval: v.number(),
      days_of_week: v.optional(v.array(v.number())),
      ends: v.optional(v.object({
        type: recurrenceEndsTypeEnum,
        count: v.optional(v.number()),
        date: v.optional(v.number()),
      })),
    }),
    conditions: v.array(
      v.object({
        metric_key: v.string(),
        component: v.optional(v.string()),
        relation: relationEnum,
        target: v.object({
          type: targetTypeEnum,
          value: v.any(),
        }),
      }),
    ),
    status: taskStatusEnum,
    created_at: v.number(),
    updated_at: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", args);
  },
});

export const generate = action({
  args: {
    assigner_id: v.string(),
    assignee_id: v.string(),
    title: v.string(),
    description: v.string(),
    visibility: visibilityEnum,
  },
  handler: async (ctx, args) => {
    try {
      const metrics = await ctx.runQuery(internal.metrics.listInternal);

      const conditions = await generateTaskConditions({
        title: args.title,
        description: args.description,
        metrics: metrics.map((m: any) => ({
          key: m.key,
          name: m.name,
          description: m.description,
          unit: m.unit,
          allowed_relations: m.allowed_relations,
          allowed_target_types: m.allowed_target_types,
        })),
      });

      const now = Date.now();
      await ctx.runMutation(internal.tasks.createInternal, {
        assigner_id: args.assigner_id,
        assignee_id: args.assignee_id,
        title: args.title,
        description: args.description,
        visibility: args.visibility,
        recurrence: { type: "once", interval: 1 },
        conditions: conditions as any,
        status: "pending",
        created_at: now,
        updated_at: now,
      });
    } catch (error) {
      console.error("Failed to generate task:", error);
      throw new Error(
        `Failed to generate task: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(visibilityEnum),
    recurrence: v.optional(v.object({
      type: recurrenceTypeEnum,
      interval: v.number(),
      days_of_week: v.optional(v.array(v.number())),
      ends: v.optional(v.object({
        type: recurrenceEndsTypeEnum,
        count: v.optional(v.number()),
        date: v.optional(v.number()),
      })),
    })),
    conditions: v.optional(
      v.array(
        v.object({
          metric_key: v.string(),
          component: v.optional(v.string()),
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
