import { authComponent, createAuth } from "./auth";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Sync user profile: ensure users table record exists for authenticated user
export const syncUserProfile = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		// Get better-auth user data
		const betterAuthUser = await authComponent.getAuthUser(ctx);
		if (!betterAuthUser) {
			throw new Error("User data unavailable");
		}

		// Check if users record exists
		const existingUser = await ctx.db.get(identity.subject);

		if (!existingUser) {
			// Create users record with same ID
			await ctx.db.insert("users", {
				_id: identity.subject,
				name: betterAuthUser.name,
				email: betterAuthUser.email,
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

		// Get users record
		const usersRecord = await ctx.db.get(identity.subject);

		return {
			id: identity.subject,
			name: betterAuthUser.name,
			email: betterAuthUser.email,
			image: betterAuthUser.image,
			credit_score: usersRecord?.credit_score ?? 0,
		};
	},
});

// Update user profile
export const updateUserProfile = mutation({
	args: {
		name: v.optional(v.string()),
		email: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		// Update better-auth user if fields provided
		if (args.name !== undefined || args.email !== undefined) {
			const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
			await auth.api.updateUser({
				body: {
					name: args.name,
					email: args.email,
				},
				headers,
			});
		}

		// Update users table
		const existingUser = await ctx.db.get(identity.subject);
		if (existingUser) {
			await ctx.db.patch(existingUser._id, {
				...(args.name !== undefined && { name: args.name }),
				...(args.email !== undefined && { email: args.email }),
			});
		}

		return { success: true };
	},
});
