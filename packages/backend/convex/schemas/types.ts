// Complex type definitions for the task verification system
import { v } from "convex/values";
import { appealResolutionActionEnum } from "./enums";

// Policy definition structure for verification policies
export const policyDefinition = v.object({
	quorum: v.number(),
	min_approvals: v.number(),
	voting_window_seconds: v.number(),
	weighting: v.object({
		user: v.number(),
		ai: v.number(),
		contract: v.number(),
	}),
	approval_threshold: v.number(),
	rejection_threshold: v.number(),
	auto_finalize_ai_confidence: v.optional(v.number()),
	tie_breaker: v.string(),
});

// Appeal resolution structure
export const appealResolution = v.object({
	action: appealResolutionActionEnum,
	notes: v.string(),
});
