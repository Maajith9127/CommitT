import { expo } from "@better-auth/expo";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { query } from "../_generated/server";

const siteUrl = process.env.SITE_URL!;
const nativeAppUrl = process.env.NATIVE_APP_URL || "mono://auth/callback";

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(
	ctx: GenericCtx<DataModel>,
	{ optionsOnly }: { optionsOnly?: boolean } = { optionsOnly: false },
) {
	// Basic logging for debugging
	if (!optionsOnly) {
		console.log(
			"Auth config - GOOGLE_CLIENT_ID exists:",
			!!process.env.GOOGLE_CLIENT_ID,
		);
		console.log(
			"Auth config - GOOGLE_CLIENT_SECRET exists:",
			!!process.env.GOOGLE_CLIENT_SECRET,
		);
	}

	return betterAuth({
		logger: {
			disabled: optionsOnly,
		},
		baseURL: siteUrl,
		trustedOrigins: [
			nativeAppUrl,
			siteUrl,
			"http://localhost:3001",
			"http://localhost:8081",
		],
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
		},
		socialProviders: {
			google: {
				clientId: process.env.GOOGLE_CLIENT_ID!,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			},
		},
		advanced: {
			crossSubDomainCookies: {
				enabled: false,
			},
			disableCSRFCheck: true,
		},
		plugins: [expo(), crossDomain({ siteUrl }), convex()],
	});
}

export { createAuth };

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => authComponent.getAuthUser(ctx),
});
