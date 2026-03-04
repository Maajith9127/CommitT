import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  relationEnum,
  targetTypeEnum,
  permissionEnum,
  visibilityEnum,
  taskStatusEnum,
  conditionStatusEnum,
  recurrenceTypeEnum,
  recurrenceEndsTypeEnum,
  verificationStyleEnum,
  intensityEnum,
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
    config: v.object({
      verification_style: verificationStyleEnum,
      grace_period_minutes: v.optional(v.number()),
      alarms: v.object({
        lead_time_minutes: v.number(),
        interval_minutes: v.number(),
        sound_key: v.string(),
      }),
      stay_throughout_config: v.optional(v.object({
        intensity: intensityEnum,
        max_missed_checkins: v.number(),
      })),
    }),
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
    // Metadata for exception handling (manual moves/removals)
    is_manual_edit: v.optional(v.boolean()),
    is_deleted_exception: v.optional(v.boolean()),
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
        status: v.optional(conditionStatusEnum),
        progress_percentage: v.optional(v.number()),
      }),
    ),
    // ═════════════════════════════════════════════════════════════════════════
    // STAY THROUGHOUT — Root-Level Checkpoints Array
    // ═════════════════════════════════════════════════════════════════════════
    // Checkpoints are deliberately stored at the root of the instance, NOT 
    // inside individual condition items. This prevents insane nested mutations
    // and easily scales to N conditions natively tracked per time-slice ping.
    checkpoints: v.optional(
      v.array(
        v.object({
          // The strict absolute bounds of this specific 5-min ping window
          start: v.optional(v.number()), // Convex Dashboard securely auto-formats native epoch timestamps to local browser times!
          end: v.optional(v.number()), 
          
          // Guaranteed absolute string truth formatted in Asia/Kolkata specifically
          // so developers parsing raw JSON arrays don't misread UTC anomalies.
          start_readable: v.optional(v.string()), 
          end_readable: v.optional(v.string()),

          // ── Backwards Compatibility Support (Do not delete)
          scheduled_time: v.optional(v.number()), 
          window_end_time: v.optional(v.number()), 

          // Dictionary map. key = metric_key (e.g. 'location', 'photo').
          // Allows granular tracking: passed the location check, but photo rejected.
          verification_status: v.optional(v.record(
            v.string(),
            v.union(v.literal("pending"), v.literal("verified"), v.literal("failed"))
          )),
          
          completed_at: v.optional(v.number()),
          
          // High-level aggregate status of this specific ping
          status: v.optional(v.union(v.literal("pending"), v.literal("verified"), v.literal("failed")))
        })
      )
    ),
    config: v.object({
      verification_style: verificationStyleEnum,
      grace_period_minutes: v.optional(v.number()),
      alarms: v.object({
        lead_time_minutes: v.number(),
        interval_minutes: v.number(),
        sound_key: v.string(),
      }),
      stay_throughout_config: v.optional(v.object({
        intensity: intensityEnum,
        max_missed_checkins: v.number(),
      })),
    }),
    // Time verification is implicit (every instance has start/end), validated server-side.
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
