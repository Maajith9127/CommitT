import { mutation } from "./_generated/server";

export const seedMetrics = mutation({
  handler: async (ctx) => {
    // 1. Time Metric
    const existingTime = await ctx.db
      .query("metrics")
      .withIndex("by_key", (q) => q.eq("key", "time"))
      .first();

    if (!existingTime) {
      await ctx.db.insert("metrics", {
        key: "time",
        name: "Time Window",
        description: "Defines the allowed time window for completing the task",
        unit: "seconds",
        components: ["start", "end"],
        allowed_relations: ["gt", "gte", "lt", "lte", "range"],

        //  IMPORTANT: allow "array" because you want multiple time windows
        allowed_target_types: ["number", "array"],

        permissions_required: [],
      });

      console.log("Created 'time' metric");
    } else {
      console.log("'time' metric already exists");
    }

    // 2. Location Metric
    const existingLocation = await ctx.db
      .query("metrics")
      .withIndex("by_key", (q) => q.eq("key", "location"))
      .first();

    if (!existingLocation) {
      await ctx.db.insert("metrics", {
        key: "location",
        name: "Location Fence",
        description:
          "Task must be completed within/outside a radius from a lat/lng point",
        unit: "meters",

        //  geo component means you'll expect {lat, lng, radius}
        components: ["geo"],

        allowed_relations: ["within", "outside"],

        //  keep as "number" because your enum doesn't include geo/object yet
        // target.value will still store an object (because schema uses v.any())
        allowed_target_types: ["number"],

        permissions_required: ["location"],
      });

      console.log("Created 'location' metric");
    } else {
      console.log("'location' metric already exists");
    }

    return "Seeding Complete";
  },
});
