// Enums for the simplified task verification system
import { v } from "convex/values";

export const visibilityEnum = v.union(
	v.literal("public"),
	v.literal("private"),
	v.literal("shared"),
);

export const conditionTypeEnum = v.union(
	v.literal("time_bound"),
	v.literal("app"),
	v.literal("location"),
	v.literal("live_video"),
);

export const taskStatusEnum = v.union(
	v.literal("pending"),
	v.literal("in_progress"),
	v.literal("completed"),
	v.literal("failed"),
);

export const stakeTypeEnum = v.union(
	v.literal("financial"),
	v.literal("reputation"),
);

export const lossOutcomeEnum = v.union(
	v.literal("donate"),
	v.literal("give_to_assigner"),
);

export const verificationTypeEnum = v.union(
	v.literal("assigner"),
	v.literal("ai"),
);

export const verificationStatusEnum = v.union(
	v.literal("approved"),
	v.literal("rejected"),
	v.literal("pending"),
);

export const chatStatusEnum = v.union(
	v.literal("active"),
	v.literal("completed"),
	v.literal("failed"),
);
