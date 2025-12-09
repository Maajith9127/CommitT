// Enums for the task verification system
import { v } from "convex/values";

export const priorityEnum = v.union(
	v.literal("low"),
	v.literal("normal"),
	v.literal("high"),
	v.literal("urgent"),
);

export const visibilityEnum = v.union(
	v.literal("public"),
	v.literal("private"),
	v.literal("shared"),
);

export const stakeTypeEnum = v.union(
	v.literal("financial"),
	v.literal("reputation"),
	v.literal("token"),
);

export const lossOutcomeEnum = v.union(
	v.literal("donate"),
	v.literal("give_to_assigner"),
	v.literal("pool"),
);

export const actorTypeEnum = v.union(
	v.literal("user"),
	v.literal("ai"),
	v.literal("contract"),
);

export const methodEnum = v.union(
	v.literal("manual"),
	v.literal("ai"),
	v.literal("witness"),
);

export const verifiedStatusEnum = v.union(
	v.literal("approved"),
	v.literal("rejected"),
	v.literal("needs_more_info"),
);

export const assignmentStatusEnum = v.union(
	v.literal("invited"),
	v.literal("accepted"),
	v.literal("declined"),
);

export const taskStatusEnum = v.union(
	v.literal("pending"),
	v.literal("in_progress"),
	v.literal("awaiting_verification"),
	v.literal("completed"),
	v.literal("rejected"),
	v.literal("appealed"),
);

export const stakeStatusEnum = v.union(
	v.literal("pending"),
	v.literal("locked"),
	v.literal("settled"),
	v.literal("forfeited"),
	v.literal("frozen"),
);

export const transactionKindEnum = v.union(
	v.literal("hold"),
	v.literal("payout"),
	v.literal("transfer"),
);

export const transactionStatusEnum = v.union(
	v.literal("pending"),
	v.literal("completed"),
	v.literal("failed"),
);

export const appealStatusEnum = v.union(
	v.literal("open"),
	v.literal("resolved"),
	v.literal("dismissed"),
);

export const appealResolutionActionEnum = v.union(
	v.literal("reopen_verification"),
	v.literal("uphold"),
	v.literal("reverse"),
);
