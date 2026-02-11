import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  relationEnum,
  targetTypeEnum,
  permissionEnum,
  visibilityEnum,
  taskStatusEnum,
  recurrenceTypeEnum,
  recurrenceEndsTypeEnum,
} from "../config/enums";

export default defineSchema({
  metrics: defineTable({
    key: v.string(),
    components: v.array(v.string()),
    name: v.string(),
    description: v.string(),
    unit: v.string(),
    allowed_relations: v.array(relationEnum),
    allowed_target_types: v.array(targetTypeEnum),
    permissions_required: v.array(permissionEnum),
  })
    .index("by_key", ["key"])
    .index("by_name", ["name"]),
  tasks: defineTable({
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
        start: v.number(),  // seconds from midnight
        end: v.number(),    // seconds from midnight
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
  })
    .index("by_assignee_id", ["assignee_id"])
    .index("by_assigner_id", ["assigner_id"])
    .index("by_created_at", ["created_at"])
    .index("by_updated_at", ["updated_at"]),

  taskInstances: defineTable({
    task_id: v.id("tasks"),
    assignee_id: v.string(),
    status: taskStatusEnum,
    start: v.number(),
    end: v.number(),
    // Snapshot of rules at creation time
    title: v.string(),
    description: v.string(),
    recurrence: v.object({
      type: recurrenceTypeEnum,
      interval: v.number(),
      days_of_week: v.optional(v.array(v.number())),
      time_windows: v.array(v.object({
        start: v.number(),  // seconds from midnight
        end: v.number(),    // seconds from midnight
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
    scheduled_job_id: v.optional(v.id("_scheduled_functions")),
    next_instance_id: v.optional(v.id("taskInstances")),
  })
    .index("by_task", ["task_id"])
    .index("by_assignee", ["assignee_id"])
    .index("by_assignee_start", ["assignee_id", "start"])
    .index("by_status", ["status"])
    .index("by_task_status", ["task_id", "status"])
    .index("by_assignee_status", ["assignee_id", "status"])
    .index("by_start", ["start"])
    .index("by_end", ["end"]),
});
