import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
	priorityEnum,
	visibilityEnum,
	stakeTypeEnum,
	lossOutcomeEnum,
	actorTypeEnum,
	methodEnum,
	verifiedStatusEnum,
	assignmentStatusEnum,
	taskStatusEnum,
	stakeStatusEnum,
	transactionKindEnum,
	transactionStatusEnum,
	appealStatusEnum,
} from "./enums";
import { policyDefinition, appealResolution } from "./types";

export default defineSchema(
	{
		// Keep existing todos table for now
		todos: defineTable({
			text: v.string(),
			completed: v.boolean(),
		}),

		// Users table - basic profile fields
		users: defineTable({
			name: v.optional(v.string()),
			email: v.optional(v.string()),
			// Add other auth-related fields as needed
		}),

		// Tasks table
		tasks: defineTable({
			assigner_id: v.id("users"),
			assignee_id: v.id("users"),
			category_id: v.optional(v.id("categories")),
			title: v.string(),
			description: v.string(),
			priority: priorityEnum,
			visibility: visibilityEnum,
			requires_verification: v.boolean(),
			verification_policy_id: v.optional(v.id("verification_policies")),
			due_at: v.optional(v.number()), // Unix timestamp
			status: taskStatusEnum,
		})
			.index("by_assignee_status", ["assignee_id", "status"])
			.index("by_assigner", ["assigner_id"])
			.index("by_due_at", ["due_at"]),

		// Proofs table
		proofs: defineTable({
			task_id: v.id("tasks"),
			submitter_id: v.id("users"),
			note: v.string(),
			namespace: v.string(),
			metadata: v.any(),
		}).index("by_task", ["task_id"]),

		// Proof resources table
		proof_resources: defineTable({
			proof_id: v.id("proofs"),
			uri: v.string(),
			mime: v.string(),
			content_hash: v.string(),
			additional_meta: v.optional(v.any()),
		}).index("by_proof", ["proof_id"]),

		// Verified actions table
		verified_actions: defineTable({
			proof_id: v.id("proofs"),
			actor_id: v.string(), // Can be user ID or system identifier
			actor_type: actorTypeEnum,
			method: methodEnum,
			status: verifiedStatusEnum,
			confidence: v.optional(v.number()),
			algorithm_version: v.optional(v.string()),
			comments: v.optional(v.string()),
			idempotency_key: v.string(),
		})
			.index("by_proof", ["proof_id"])
			.index("by_actor", ["actor_id"]),

		// Witness assignments table
		witness_assignments: defineTable({
			task_id: v.id("tasks"),
			witness_id: v.id("users"),
			invited_by: v.id("users"),
			assignment_status: assignmentStatusEnum,
		}).index("by_task_status", ["task_id", "assignment_status"]),

		// Verification policies table
		verification_policies: defineTable({
			name: v.string(),
			policy_definition: policyDefinition,
		}),

		// Task state log table
		task_state_log: defineTable({
			task_id: v.id("tasks"),
			old_status: v.string(),
			new_status: v.string(),
			changed_by: v.optional(v.id("users")),
			reason: v.optional(v.string()),
		}).index("by_task", ["task_id"]),

		// Audit logs table
		audit_logs: defineTable({
			table_name: v.string(),
			record_id: v.string(),
			action: v.string(),
			user_id: v.optional(v.id("users")),
			details: v.any(),
		})
			.index("by_table_record", ["table_name", "record_id"])
			.index("by_user", ["user_id"]),

		// Stakes table
		stakes: defineTable({
			task_id: v.id("tasks"),
			staker_id: v.id("users"),
			amount: v.number(),
			stake_type: stakeTypeEnum,
			loss_outcome: lossOutcomeEnum,
			loss_target: v.optional(v.string()),
			status: stakeStatusEnum,
			idempotency_key: v.string(),
		}).index("by_task_status", ["task_id", "status"]),

		// Transactions table
		transactions: defineTable({
			stake_id: v.id("stakes"),
			kind: transactionKindEnum,
			amount: v.number(),
			currency: v.string(),
			reference_id: v.optional(v.string()),
			status: transactionStatusEnum,
		})
			.index("by_stake", ["stake_id"])
			.index("by_status", ["status"]),

		// Reputation events table
		reputation_events: defineTable({
			user_id: v.id("users"),
			task_id: v.optional(v.id("tasks")),
			delta: v.number(),
			reason: v.string(),
		}).index("by_user", ["user_id"]),

		// Appeals table
		appeals: defineTable({
			task_id: v.id("tasks"),
			raised_by: v.id("users"),
			reason: v.string(),
			status: appealStatusEnum,
			resolved_by: v.optional(v.id("users")),
			resolution: v.optional(appealResolution),
		})
			.index("by_task", ["task_id"])
			.index("by_status", ["status"]),

		// Work sessions table (inferred from API)
		work_sessions: defineTable({
			task_id: v.id("tasks"),
			user_id: v.id("users"),
			start: v.boolean(),
			end_time: v.optional(v.number()), // Unix timestamp
		}).index("by_task_user", ["task_id", "user_id"]),
	},
	{
		schemaValidation: true,
	},
);
