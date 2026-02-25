import { v } from "convex/values";

export const relationEnum = v.union(
  v.literal("eq"),
  v.literal("neq"),
  v.literal("gt"),
  v.literal("gte"),
  v.literal("lt"),
  v.literal("lte"),
  v.literal("in"),
  v.literal("not_in"),
  v.literal("within"),
  v.literal("outside"),
  v.literal("exists"),
  v.literal("matches"),
  v.literal("range"),
);

export const targetTypeEnum = v.union(
  v.literal("number"),
  v.literal("string"),
  v.literal("boolean"),
  v.literal("array"),
  v.literal("range"),
  v.literal("file"),
  v.literal("log"),
);

export const permissionEnum = v.union(
  v.literal("manual"),
  v.literal("application"),
  v.literal("system"),
  v.literal("network"),
  v.literal("location"),
  v.literal("media"),
  v.literal("external"),
);

export const visibilityEnum = v.union(
  v.literal("public"),
  v.literal("private"),
  v.literal("shared"),
);

export const taskStatusEnum = v.union(
  v.literal("pending"),
  v.literal("proceeding"),
  v.literal("proceeded"),
  v.literal("failed"),
);

export const conditionStatusEnum = v.union(
  v.literal("neutral"),
  v.literal("verified"),
  v.literal("failed"),
  v.literal("applied"),
  v.literal("waived"),
  v.literal("percentage"),
);

export const recurrenceTypeEnum = v.union(
  v.literal("once"),
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("yearly"),
  v.literal("custom"),
);

export const recurrenceEndsTypeEnum = v.union(
  v.literal("never"),
  v.literal("after"),
  v.literal("on"),
);
