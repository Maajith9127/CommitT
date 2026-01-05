import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  relationEnum,
  targetTypeEnum,
  permissionEnum,
  visibilityEnum,
  taskStatusEnum,
} from "./enums";

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
  })
    .index("by_assignee_id", ["assignee_id"])
    .index("by_assigner_id", ["assigner_id"])
    .index("by_status", ["status"])
    .index("by_assignee_status", ["assignee_id", "status"])
    .index("by_assigner_status", ["assigner_id", "status"])
    .index("by_created_at", ["created_at"])
    .index("by_updated_at", ["updated_at"]),
});
