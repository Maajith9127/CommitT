/**
 * Task Management Module
 * ==========================================
 * This file handles all the backend logic for Tasks (Commitments).
 * It uses a secure, validation-first approach.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Queries: Fetching tasks with security filters
 * 2. Mutations: Creating, Updating, Deleting tasks
 * 3. Security: Validation & Conflict Detection
 * 4. Scheduling: Ensuring the verification (check) system runs on time
 * 
 * @module tasks
 */

import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { relationEnum, targetTypeEnum, visibilityEnum, recurrenceTypeEnum, recurrenceEndsTypeEnum } from "./enums";
import { generateTaskConditions } from "./opencode";
import { internal } from "./_generated/api";
import { findConflict, formatConflictMessage } from "./lib/conflictDetection";
import { findNextTimeSlot } from "./lib/scheduling";
import { validateTaskInput, validateTaskUpdate } from "./lib/validation";
import { scheduleNextInstance } from "./lib/instanceScheduling";

// ─────────────────────────────────────────────────────────────────────────────
// 1. REUSABLE SCHEMAS (Validation Rules)
// ─────────────────────────────────────────────────────────────────────────────
// We define these once here so we don't copy-paste 50 lines of code every time.

/** Defines how often a task repeats (e.g., "Every 2 days from 9am-5pm") */
const RecurrenceSchema = v.object({
  type: recurrenceTypeEnum,                // "daily", "weekly", etc.
  interval: v.number(),                    // e.g. "Every 2 days"
  days_of_week: v.optional(v.array(v.number())), // 0-6 for Mon-Sun
  
  // Specific time slots when the task MUST be done
  time_windows: v.array(v.object({
    start: v.number(),                     // Seconds from midnight
    end: v.number(),                       // Seconds from midnight
  })),
  
  // When does the recurrence verify?
  ends: v.optional(v.object({
    type: recurrenceEndsTypeEnum,
    count: v.optional(v.number()),
    date: v.optional(v.number()),
  })),
});

/** Defines the success criteria (e.g., "Location must be Gym") */
const ConditionsSchema = v.array(v.object({
  metric_key: v.string(),                  // What are we measuring?
  component: v.optional(v.string()),       // Specific component?
  relation: relationEnum,                  // "equals", "greater_than", etc.
  target: v.object({
    type: targetTypeEnum,                  // "number", "location", etc.
    value: v.any(),                        // The target value
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// 2. QUERIES (Reading Data)
// ─────────────────────────────────────────────────────────────────────────────

/** List all tasks (Admin/Debug only) */
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});

/** Get a single task by ID */
export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** List tasks assigned TO a user */
export const listByAssignee = query({
  args: { assignee_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_assignee_id", (q) => q.eq("assignee_id", args.assignee_id))
      .collect();
  },
});

/** List tasks assigned BY a user */
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
// 3. MUTATIONS (Writing Data)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * create(): The main function to create a new commitment.
 * 
 * LOGIC FLOW:
 * 1. Validate Input (Security)
 * 2. Check Conflicts (Logic)
 * 3. Save to DB (Persistence)
 * 4. Schedule Verification (Async System)
 */
export const create = mutation({
  args: {
    // assigner_id is removed - we get it from auth
    assignee_id: v.string(),
    title: v.string(),
    description: v.string(),
    visibility: visibilityEnum,
    recurrence: RecurrenceSchema,  // Reused from above!
    conditions: ConditionsSchema,  // Reused from above!
  },
  handler: async (ctx, args) => {
    // -------------------------------------------------------------------------
    // STEP 0: AUTHENTICATION
    // -------------------------------------------------------------------------
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false as const,
        error: {
          code: "UNAUTHENTICATED",
          message: "You must be logged in to create a task",
        },
      };
    }
    const assigner_id = identity.subject;

    // -------------------------------------------------------------------------
    // STEP 1: VALIDATE INPUT
    // -------------------------------------------------------------------------
    // We never trust the frontend. We re-validate everything here.
    const validation = validateTaskInput({ ...args, assigner_id });
    if (!validation.valid) {
      return { 
        success: false as const, 
        error: { code: validation.errorCode, message: validation.error } 
      };
    }

    // -------------------------------------------------------------------------
    // STEP 2: CHECK FOR SCHEDULE CONFLICTS
    // -------------------------------------------------------------------------
    // A user cannot have two tasks at the exact same time.
    //
    // TRANSACTION SAFETY NOTE:
    // This is race-condition safe because Convex mutations are serializable.
    // If two requests try to create conflicting tasks simultaneously:
    // 1. Req A reads existing tasks -> sees None -> Inserts Task A
    // 2. Req B reads existing tasks -> sees None -> ...
    //    Convex detects Req A changed the data Req B read.
    //    Req B is automatically RETRIED.
    // 3. Req B runs again -> reads tasks -> sees Task A -> Returns CONFLICT.
    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_assignee_id", (q) => q.eq("assignee_id", args.assignee_id))
      .collect();

    const conflictResult = findConflict({
      assignee_id: args.assignee_id,
      title: args.title,
      recurrence: args.recurrence,
    }, existingTasks);

    if (conflictResult.hasConflict) {
      return {
        success: false as const,
        error: {
          code: "SCHEDULE_CONFLICT",
          message: formatConflictMessage(conflictResult.details),
          details: conflictResult.details,
        }
      };
    }

    // -------------------------------------------------------------------------
    // STEP 3: INSERT INTO DATABASE
    // -------------------------------------------------------------------------
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      ...args,
      assigner_id, // Force the real user ID
      created_at: now,
      updated_at: now,
    });

    // -------------------------------------------------------------------------
    // STEP 4: SCHEDULE FIRST INSTANCE
    // -------------------------------------------------------------------------
    // We kickstart the "Verification Chain" by scheduling the first instance.
    await scheduleNextInstance(ctx, taskId, now);

    return { success: true as const, taskId };
  },
});

/**
 * update(): Updates an existing task securely.
 */
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(visibilityEnum),
    recurrence: v.optional(RecurrenceSchema),
    conditions: v.optional(ConditionsSchema),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // 0. Authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false as const,
        error: {
          code: "UNAUTHENTICATED",
          message: "You must be logged in to update a task",
        },
      };
    }

    // 1. Fetch Existing
    const existingTask = await ctx.db.get(id);
    if (!existingTask) {
      return { success: false as const, error: { code: "TASK_NOT_FOUND", message: "Task not found" } };
    }

    // 2. Authorization
    if (existingTask.assigner_id !== identity.subject) {
       return {
        success: false as const,
        error: {
          code: "UNAUTHORIZED",
          message: "You do not have permission to update this task",
        },
      };
    }

    // 3. Validate Update (Merged with existing data)
    const validation = validateTaskUpdate(updates, {
      assigner_id: existingTask.assigner_id,
      assignee_id: existingTask.assignee_id,
      title: existingTask.title,
      description: existingTask.description ?? "",
      visibility: existingTask.visibility,
      recurrence: existingTask.recurrence,
      conditions: existingTask.conditions,
    });

    if (!validation.valid) {
      return { success: false as const, error: { code: validation.errorCode, message: validation.error } };
    }

    // 3. Conflict Check (Only if schedule changes)
    if (updates.recurrence) {
      const allTasks = await ctx.db
        .query("tasks")
        .withIndex("by_assignee_id", (q) => q.eq("assignee_id", existingTask.assignee_id))
        .collect();

      const conflictResult = findConflict({
        _id: id,
        assignee_id: existingTask.assignee_id,
        title: updates.title ?? existingTask.title,
        recurrence: updates.recurrence,
      }, allTasks, id); // Exclude self

      if (conflictResult.hasConflict) {
        return {
          success: false as const,
          error: {
            code: "SCHEDULE_CONFLICT",
            message: formatConflictMessage(conflictResult.details),
            details: conflictResult.details,
          }
        };
      }
    }

    // 4. Update DB
    await ctx.db.patch(id, { ...updates, updated_at: Date.now() });

    return { success: true as const };
  },
});

/** 
 * remove(): Delete a task permanently 
 */
export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    // 0. Authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
       throw new Error("UNAUTHENTICATED: You must be logged in to delete a task");
    }

    const task = await ctx.db.get(args.id);
    if (!task) return; // Already deleted

    // 1. Authorization
    if (task.assigner_id !== identity.subject) {
        throw new Error("UNAUTHORIZED: You do not have permission to delete this task");
    }

    await ctx.db.delete(args.id);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. INTERNAL SYSTEM FUNCTIONS (Internal Use Only)
// ─────────────────────────────────────────────────────────────────────────────
// These functions are NOT accessible from the frontend. Secure by design.

/**
 * createInternal(): Used by AI or System processes to create tasks.
 * Bypasses standard validation.
 */
export const createInternal = internalMutation({
  args: {
    assigner_id: v.string(),
    assignee_id: v.string(),
    title: v.string(),
    description: v.string(),
    visibility: visibilityEnum,
    recurrence: RecurrenceSchema,
    conditions: ConditionsSchema,
    created_at: v.number(),
    updated_at: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", args);
  },
});

/**
 * runScheduledCheck(): The heartbeat of the system.
 * This function runs automatically at the end of every time slot.
 */
export const runScheduledCheck = internalMutation({
  args: { instanceId: v.id("taskInstances") },
  handler: async (ctx, args) => {
    // 1. Fetch the Instance
    const instance = await ctx.db.get(args.instanceId);
    if (!instance) {
      console.log(`[runScheduledCheck] Instance ${args.instanceId} not found. Chain broken.`);
      return;
    }

    // 2. Fetch the Parent Task (for context, though instance has snapshot)
    const task = await ctx.db.get(instance.task_id);
    if (!task) {
        console.log(`[runScheduledCheck] Parent Task ${instance.task_id} deleted. stopping chain.`);
        return;
    }

    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`[runScheduledCheck] VERIFYING: ${instance.title}`);
    console.log(`[runScheduledCheck] Time     : ${new Date().toISOString()}`);
    console.log("═══════════════════════════════════════════════════════════════");

    // -------------------------------------------------------------------------
    // STEP 1: VERIFY & GRADE
    // -------------------------------------------------------------------------
    // TODO: Implement actual verification logic (GPS, Photos, etc)
    // For now, we assume success if it ran.
    
    // Update status to PROCEEDED (or FAILED based on checks)
    await ctx.db.patch(args.instanceId, { 
      status: "proceeded" 
    });

    // -------------------------------------------------------------------------
    // STEP 2: CONTINUE THE CHAIN
    // -------------------------------------------------------------------------
    // Schedule the NEXT instance based on the parent task's rules.
    // We start looking for slots *after* the current instance ended.
    await scheduleNextInstance(ctx, task._id, instance.end);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. OPEN ACTIONS (External APIs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * generate(): AI-powered task generator.
 */
export const generate = action({
  // Simplified for brevity, same logic as before
  args: {
    // assigner_id removed - secured via auth
    assignee_id: v.string(),
    title: v.string(),
    description: v.string(),
    visibility: visibilityEnum,
  },
  handler: async (ctx, args) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("UNAUTHENTICATED: You must be logged in to generate a task");
      }
      const assigner_id = identity.subject;

      const metrics = await ctx.runQuery(internal.metrics.listInternal);
      // AI Logic to generate conditions...
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
        assigner_id: assigner_id,
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
      throw new Error(`Failed to generate task: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});
