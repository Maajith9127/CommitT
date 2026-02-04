import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { relationEnum, targetTypeEnum, visibilityEnum, recurrenceTypeEnum, recurrenceEndsTypeEnum } from "./enums";
import { generateTaskConditions } from "./opencode";
import { internal } from "./_generated/api";
import { findConflict, formatConflictMessage } from "./lib/conflictDetection";

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new task with conflict detection.
 *
 * Returns a result object instead of throwing to avoid triggering
 * React Native's error overlay in development mode.
 *
 * @returns { success: true, taskId: Id } on success
 * @returns { success: false, error: { code, message, details } } on conflict
 */
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
      time_windows: v.array(v.object({
        start: v.number(),
        end: v.number(),
      })),
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
    // ─────────────────────────────────────────────────────────────────────────
    // Conflict Detection
    // ─────────────────────────────────────────────────────────────────────────
    
    // Fetch all existing tasks for this assignee
    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_assignee_id", (q) => q.eq("assignee_id", args.assignee_id))
      .collect();

    // Check for scheduling conflicts
    const conflictResult = findConflict(
      {
        assignee_id: args.assignee_id,
        title: args.title,
        recurrence: args.recurrence,
      },
      existingTasks
    );

    if (conflictResult.hasConflict) {
      // Return error result instead of throwing
      return {
        success: false as const,
        error: {
          code: "SCHEDULE_CONFLICT",
          message: formatConflictMessage(conflictResult.details),
          details: conflictResult.details,
        },
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Insert Task
    // ─────────────────────────────────────────────────────────────────────────
    
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      ...args,
      created_at: now,
      updated_at: now,
    });

    return {
      success: true as const,
      taskId,
    };
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
      time_windows: v.array(v.object({
        start: v.number(),
        end: v.number(),
      })),
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
        recurrence: { type: "once", interval: 1, time_windows: [] },
        conditions: conditions as any,
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

/**
 * Update an existing task with conflict detection.
 *
 * Returns a result object instead of throwing to avoid triggering
 * React Native's error overlay in development mode.
 *
 * @returns { success: true } on success
 * @returns { success: false, error: { code, message, details? } } on conflict or not found
 */
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
      time_windows: v.array(v.object({
        start: v.number(),
        end: v.number(),
      })),
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
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // ─────────────────────────────────────────────────────────────────────────
    // Conflict Detection (only if recurrence is being updated)
    // ─────────────────────────────────────────────────────────────────────────

    if (updates.recurrence) {
      // Get the existing task to find assignee_id
      const existingTask = await ctx.db.get(id);
      if (!existingTask) {
        return {
          success: false as const,
          error: {
            code: "TASK_NOT_FOUND",
            message: "Task not found",
          },
        };
      }

      // Fetch all existing tasks for this assignee
      const allTasks = await ctx.db
        .query("tasks")
        .withIndex("by_assignee_id", (q) => q.eq("assignee_id", existingTask.assignee_id))
        .collect();

      // Check for scheduling conflicts (excluding this task)
      const conflictResult = findConflict(
        {
          _id: id,
          assignee_id: existingTask.assignee_id,
          title: updates.title ?? existingTask.title,
          recurrence: updates.recurrence,
        },
        allTasks,
        id // Exclude self
      );

      if (conflictResult.hasConflict) {
        return {
          success: false as const,
          error: {
            code: "SCHEDULE_CONFLICT",
            message: formatConflictMessage(conflictResult.details),
            details: conflictResult.details,
          },
        };
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Update Task
    // ─────────────────────────────────────────────────────────────────────────

    await ctx.db.patch(id, {
      ...updates,
      updated_at: Date.now(),
    });

    return {
      success: true as const,
    };
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
