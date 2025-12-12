import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
	chatStatusEnum,
	conditionTypeEnum,
	stakeTypeEnum,
	taskStatusEnum,
	verificationStatusEnum,
	verificationTypeEnum,
	visibilityEnum,
} from "./enums";

export default defineSchema(
	{
		user_profiles: defineTable({
			user_id: v.string(),
			credit_score: v.number(),
		}).index("by_user_id", ["user_id"]),

		tasks: defineTable({
			assigner_id: v.id("users"),
			assignee_id: v.id("users"),
			title: v.string(),
			description: v.string(),
			visibility: visibilityEnum,
			conditions: v.array(
				v.object({
					condition_id: v.string(),
					type: conditionTypeEnum,
					params: v.any(),
					description: v.string(),
				}),
			),
			start_at: v.optional(v.number()),
			due_at: v.optional(v.number()),
			status: taskStatusEnum,
			requires_verification: v.boolean(),
		})
			.index("by_assignee_status", ["assignee_id", "status"])
			.index("by_due_at", ["due_at"]),

		proofs: defineTable({
			task_id: v.id("tasks"),
			submitter_id: v.id("users"),
			submitted_at: v.number(),
			location: v.optional(v.object({ lat: v.number(), lng: v.number() })),
		}).index("by_task", ["task_id"]),

		proof_resources: defineTable({
			proof_id: v.id("proofs"),
			uri: v.string(),
			mime: v.string(),
		}).index("by_proof", ["proof_id"]),

		verifications: defineTable({
			proof_id: v.id("proofs"),
			verifier_id: v.union(v.id("users"), v.id("verification_chats")),
			verification_type: verificationTypeEnum,
			status: verificationStatusEnum,
			comments: v.optional(v.string()),
			verified_at: v.number(),
		}).index("by_proof", ["proof_id"]),

		verification_chats: defineTable({
			user_id: v.id("users"),
			status: chatStatusEnum,
			created_at: v.number(),
			task_id: v.id("tasks"),
			proof_id: v.id("proofs"),
			messages: v.array(
				v.object({
					sender: v.union(
						v.literal("system"),
						v.literal("user"),
						v.literal("ai"),
					),
					content: v.string(),
					timestamp: v.number(),
				}),
			),
		}).index("by_task", ["task_id"]),

		stakes: defineTable({
			task_id: v.id("tasks"),
			staker_id: v.id("users"),
			amount: v.number(),
			stake_type: stakeTypeEnum,
			loss_outcome: v.union(v.literal("donate"), v.literal("give_to_assigner")),
			status: v.union(
				v.literal("pending"),
				v.literal("settled"),
				v.literal("forfeited"),
			),
		}).index("by_task_status", ["task_id", "status"]),

		credit_events: defineTable({
			user_id: v.id("users"),
			task_id: v.optional(v.id("tasks")),
			change: v.number(),
			reason: v.string(),
			timestamp: v.number(),
		}).index("by_user", ["user_id"]),
	},
	{ schemaValidation: true },
);
