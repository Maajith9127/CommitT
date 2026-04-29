import {
  mutation,
  query,
  action,
  type MutationCtx,
  type QueryCtx,
  type ActionCtx,
} from "../_generated/server";
import { api } from "../_generated/api";
import { Validator } from "convex/values";
import { authComponent } from "./auth";

/**
 * AUTHENTICATED MUTATION WRAPPER
 *
 * Automatically verifies the user is logged in.
 * Throws "UNAUTHENTICATED" if valid session is not found.
 * Passes the `user` object to the handler.
 */
export const authedMutation = <Args extends Record<string, Validator<any, any, any>>, Output>(
  { args, handler }: { args: Args; handler: (ctx: MutationCtx & { user: any }, args: any) => Promise<Output> }
) => {
  return mutation({
    args,
    handler: (async (ctx: MutationCtx, args: any) => {
      const user = await authComponent.safeGetAuthUser(ctx);
      if (!user) {
        throw new Error("UNAUTHENTICATED: You must be logged in.");
      }
      return handler({ ...ctx, user }, args);
    }) as any,
  });
};

/**
 * AUTHENTICATED QUERY WRAPPER
 *
 * Automatically verifies the user is logged in.
 * Throws "UNAUTHENTICATED" if valid session is not found.
 * Passes the `user` object to the handler.
 */
export const authedQuery = <Args extends Record<string, Validator<any, any, any>>, Output>(
  { args, handler }: { args: Args; handler: (ctx: QueryCtx & { user: any }, args: any) => Promise<Output> }
) => {
  return query({
    args,
    handler: (async (ctx: QueryCtx, args: any) => {
      const user = await authComponent.safeGetAuthUser(ctx);
      if (!user) {
        throw new Error("UNAUTHENTICATED: You must be logged in.");
      }
      return handler({ ...ctx, user }, args);
    }) as any,
  });
};

/**
 * AUTHENTICATED ACTION WRAPPER
 *
 * Automatically verifies the user is logged in.
 * Fetches the user via `getCurrentUser` query since actions cannot access DB.
 * Throws "UNAUTHENTICATED" if valid session is not found.
 * Passes the `user` object to the handler.
 */
export const authedAction = <Args extends Record<string, Validator<any, any, any>>, Output>(
  { args, handler }: { args: Args; handler: (ctx: ActionCtx & { user: any }, args: any) => Promise<Output> }
) => {
  return action({
    args,
    handler: (async (ctx: ActionCtx, args: any) => {
      // Actions can't use DB directly, so we use runQuery to get the auth state
      const user = await ctx.runQuery(api.middleware.auth.getCurrentUser);
      if (!user) {
        throw new Error("UNAUTHENTICATED: You must be logged in.");
      }
      return handler({ ...ctx, user }, args);
    }) as any,
  });
};
