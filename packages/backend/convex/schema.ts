import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { relationEnum, targetTypeEnum, permissionEnum, visibilityEnum, taskStatusEnum } from "./enums";

export default defineSchema({
  metrics: defineTable({
    key: v.string(),
    name: v.string(),
    description: v.string(),
    unit: v.string(),
    allowed_relations: v.array(relationEnum),
    allowed_target_types: v.array(targetTypeEnum),
    permissions_required: v.array(permissionEnum),
  }),
  tasks: defineTable({
    assigner_id: v.id("users"),
    assignee_id: v.id("users"),
    title: v.string(),
    description: v.string(),
    visibility: visibilityEnum,
    time_window: v.object({
      start_at: v.number(),
      due_at: v.number(),
    }),
    conditions: v.array(
      v.object({
        metric: v.string(),
        relation: relationEnum,
        target: v.object({
          type: targetTypeEnum,
          value: v.any(),
        }),
      })
    ),
    status: taskStatusEnum,
    created_at: v.number(),
    updated_at: v.number(),
  }),
});
