import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { authComponent, createAuth } from "./auth";

// Sync user profile: ensure user_profiles table record exists for authenticated user
export const syncUserProfile = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		// Check if user_profiles record exists
		const existingProfile = await ctx.db
			.query("user_profiles")
			.withIndex("by_user_id", (q) => q.eq("user_id", identity.subject))
			.first();

		if (!existingProfile) {
			// Create user_profiles record
			await ctx.db.insert("user_profiles", {
				user_id: identity.subject,
				credit_score: 0,
			});
		}

		return { success: true };
	},
});

// Get complete user profile
export const getUserProfile = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		// Get better-auth user data
		const betterAuthUser = await authComponent.getAuthUser(ctx);
		if (!betterAuthUser) {
			return null;
		}

		// Get user_profiles record
		const userProfile = await ctx.db
			.query("user_profiles")
			.withIndex("by_user_id", (q) => q.eq("user_id", identity.subject))
			.first();

		return {
			id: identity.subject,
			name: betterAuthUser.name,
			email: betterAuthUser.email,
			image: betterAuthUser.image,
			credit_score: userProfile?.credit_score ?? 0,
		};
	},
});

// Update user profile
export const updateUserProfile = mutation({
	args: {
		name: v.optional(v.string()),
		// Note: email updates are not supported via this API for security reasons
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		// Update better-auth user if name provided
		if (args.name !== undefined) {
			const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
			await auth.api.updateUser({
				body: {
					name: args.name,
				},
				headers,
			});
		}

		// Note: name is managed by better-auth, email cannot be updated via API

		return { success: true };
	},
});
