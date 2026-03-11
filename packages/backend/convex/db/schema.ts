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
  penaltyTypeEnum,
  waiverTypeEnum,
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

  // ═══════════════════════════════════════════════════════════════════════
  // CENTRAL ASSET REGISTRY — Metadata for every file in Convex Storage
  // ═══════════════════════════════════════════════════════════════════════
  // Useful for:
  // 1. Ownership: Who uploaded this? (Security)
  // 2. Lifecycle: When was it uploaded? (Cleanup/GC)
  // 3. Purpose: Tagging files (e.g., 'penalty_photo') for reverse lookups.
  //
  // ═══════════════════════════════════════════════════════════════════════
  // CENTRAL ASSET REGISTRY — Universal File Management
  // ═══════════════════════════════════════════════════════════════════════
  // A single table for all binary assets (Photos, Videos, PDFs).
  //
  // WHY A SINGLE TABLE?
  // 1. Unified Security: One place to enforce ownership and ACLs.
  // 2. Performance: One index for "User's Recent Activity" across all media types.
  // 3. Maintenance: Simplifies garbage collection and storage usage reporting.
  //
  files: defineTable({
    storageId: v.id("_storage"),
    userId: v.string(),
    contentType: v.optional(v.string()),  // e.g., "image/jpeg", "video/mp4"
    size: v.optional(v.number()),         // File size in bytes (useful for quotas)
    tag: v.optional(v.string()),          // Logic-specific tag (e.g., 'penalty_photo')
    metadata: v.optional(v.any()),        // Type-specific: { width, height } for photos, { duration } for videos
    created_at: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_tag", ["tag"])
    .index("by_storageId", ["storageId"]),

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
    // ═══════════════════════════════════════════════════════════════════════
    // PENALTY & WAIVER — Master Rules (Source of Truth)
    // ═══════════════════════════════════════════════════════════════════════
    //
    // These define the "contract" the user agreed to when creating the task.
    // When instances are generated, these values are COPIED (snapshotted)
    // onto each instance. This prevents retroactive rule manipulation:
    //   e.g., User sets ₹500 penalty → fails → quickly edits to ₹10.
    // The instance keeps the original ₹500 snapshot.
    //
    // `config` uses `v.any()` because each penalty/waiver type has a
    // different shape. Type safety is enforced at the VALIDATOR layer
    // (lib/validators.ts) and the EXECUTOR layer (core/penalty/dispatcher.ts).
    //
    penalty: v.optional(v.object({
      type: penaltyTypeEnum,    // Discriminator for the penalty dispatcher
      config: v.any(),          // Type-specific payload (photo URI, amount, etc.)
    })),
    penalty_waiver: v.optional(v.object({
      type: waiverTypeEnum,     // Discriminator for the waiver verifier
      config: v.any(),          // Type-specific settings (captcha count, word count, etc.)
      deadline_minutes: v.number(), // How long the user has to complete the waiver after failing
    })),
    strict_until: v.optional(v.number()),
    strict_duration_days: v.optional(v.number()),
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
    // ═══════════════════════════════════════════════════════════════════════
    // THE STEEL VAULT — Strict Mode Enforcement
    // ═══════════════════════════════════════════════════════════════════════
    // If set, this timestamp (epoch ms) defines a "Strict Lock Zone". 
    // The backend WILL REJECT any mutation or deletion of this instance 
    // as long as `Date.now() < strict_until`. This is the core mechanism 
    // for self-binding commitments.
    // ═══════════════════════════════════════════════════════════════════════
    strict_until: v.optional(v.number()),
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
    // ═══════════════════════════════════════════════════════════════════════
    // PENALTY & WAIVER — Immutable Snapshots from Parent Task
    // ═══════════════════════════════════════════════════════════════════════
    //
    // These are FROZEN copies of the parent task's penalty/waiver rules,
    // captured at the moment this instance was created. They are NEVER
    // updated, even if the user later edits their task settings.
    //
    // WHY: Ensures the "punishment contract" cannot be changed after the
    // fact. The instance enforces the rules that were active when the
    // user committed to the task.
    //
    // NOTE: Uses `v.string()` instead of the enum validators because these
    // are snapshots — if we later remove a penalty type from the enum,
    // existing snapshots should still be readable without schema errors.
    //
    penalty: v.optional(v.object({
      type: v.string(),         // Snapshot of penaltyTypeEnum value at creation time
      config: v.any(),          // Snapshot of type-specific config
    })),
    penalty_waiver: v.optional(v.object({
      type: v.string(),         // Snapshot of waiverTypeEnum value at creation time
      config: v.any(),          // Snapshot of type-specific config
      deadline_minutes: v.number(), // Snapshot of waiver deadline
    })),
    // ═══════════════════════════════════════════════════════════════════════
    // WAIVER LIFECYCLE STATE — Mutable Runtime Tracking
    // ═══════════════════════════════════════════════════════════════════════
    //
    // Unlike everything above (which is immutable), this object is MUTATED
    // at runtime as the user progresses through the waiver challenge.
    //
    // Only populated when status transitions to 'failed' → 'waiver_active'.
    // Remains `undefined` for instances that succeed or have no waiver.
    //
    // CRITICAL FIELD: `penalty_job_id`
    //   This is the ID of a Convex durable scheduled function that will
    //   execute the penalty when `expires_at` is reached. It is the "bomb"
    //   that WILL detonate unless explicitly cancelled via:
    //     `ctx.scheduler.cancel(waiver_state.penalty_job_id)`
    //   This cancel only happens when the waiver verifier confirms completion.
    //
    waiver_state: v.optional(v.object({
      status: v.union(
        v.literal("offered"),      // Task failed → waiver window opened
        v.literal("in_progress"),  // User actively working on the waiver challenge
        v.literal("completed"),    //  Waiver verified → penalty cancelled
        v.literal("expired"),      //  Deadline passed → penalty executed
        v.literal("skipped"),      // User explicitly declined the waiver
      ),
      opened_at: v.number(),             // Epoch ms when the waiver was first offered
      expires_at: v.number(),            // Epoch ms deadline — penalty fires after this
      started_at: v.optional(v.number()),    // Epoch ms when user began the challenge
      completed_at: v.optional(v.number()),  // Epoch ms when user finished the challenge
      /**
       * challenges: THE WORKFLOW QUEUE
       * Each entry is a single "unit of proof" needed to waive the penalty.
       */
        challenges: v.optional(v.array(v.object({
          type: v.string(),                    // Discriminant (e.g., "captcha")
          status: v.union(v.literal("pending"), v.literal("completed")),
          created_at: v.number(),              // Epoch ms when this specific puzzle was dealt
          completed_at: v.optional(v.number()), // Epoch ms when successfully solved
          vault: v.any(),                      // The secret / solution data 
        }))),
    })),
    // ═══════════════════════════════════════════════════════════════════════
    // DURABLE SCHEDULING — Background Side Effects
    // ═══════════════════════════════════════════════════════════════════════
    // These track active background jobs (alarms/penalties) for this instance.
    // Stored at the root for fast lookup and atomic cleanup on deletion.
    //
    // 1. verification: "Did you show up?" (Heartbeat)
    scheduled_job_id: v.optional(v.id("_scheduled_functions")),
    // 2. enforcement:  "Waiver deadline expired, fire penalty!" (Gatekeeper)
    enforcement_job_id: v.optional(v.id("_scheduled_functions")),

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

  // ═══════════════════════════════════════════════════════════════════════
  // ACCOUNTABILITY PRESET LIBRARY — The "Contract Templates"
  // ═══════════════════════════════════════════════════════════════════════
  // This table functions as a persistent "memory" of a user's commitment style.
  //
  // DESIGN RATIONALE:
  // Decoupling penalty configurations from specific tasks allows for:
  // 1. User Persistence: Settings survive even if individual tasks are deleted.
  // 2. Zero-Friction Setup: New tasks can be "pre-armed" with the user's usual
  //    contract (e.g., ₹500 penalty + 10 CAPTCHAs) without manual entry.
  // 3. Templating: User can eventually name and manage "Profiles".
  // ═══════════════════════════════════════════════════════════════════════
  accountabilityPresets: defineTable({
    userId: v.string(),             // The owner of the template
    name: v.optional(v.string()),    // Human-readable identifier (e.g., "Deep Work Vault")
    
    // Contract Snapshots
    penalty: v.object({
      type: penaltyTypeEnum,
      config: v.any(),
    }),
    penalty_waiver: v.optional(v.object({
      type: waiverTypeEnum,
      config: v.any(),
      deadline_minutes: v.number(),
    })),
    
    // Metadata for "Smart Pre-fill" Sorting
    last_used_at: v.number(),        // Recency score for "Suggest Latest"
    usage_count: v.number(),         // Popularity score for "Suggest Most Frequent"
  })
    .index("by_userId", ["userId"])
    .index("by_userId_recency", ["userId", "last_used_at"]),
});
