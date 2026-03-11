/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  FILES — Convex Storage Gateway                                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                            ║
 * ║  Provides a thin, reusable API over Convex's built-in file storage.        ║
 * ║  Used by ANY feature that needs to upload or retrieve binary assets         ║
 * ║  (images, videos, documents, etc).                                         ║
 * ║                                                                            ║
 * ║  CURRENT CONSUMERS:                                                        ║
 * ║  • Penalty Engine: "Embarrassing Photo" penalty uploads the cringe         ║
 * ║    image here, stores the resulting `storageId` in the task's penalty      ║
 * ║    config, and the executor retrieves it via `getUrl` at penalty time.     ║
 * ║                                                                            ║
 * ║  UPLOAD FLOW (Client → Server):                                            ║
 * ║  1. Client calls `generateUploadUrl()` → receives a short-lived POST URL. ║
 * ║  2. Client POSTs the raw file bytes to that URL with Content-Type header.  ║
 * ║  3. Convex responds with `{ storageId }` — a permanent, immutable ref.    ║
 * ║  4. Client stores `storageId` in the relevant document (draft, task, etc). ║
 * ║                                                                            ║
 * ║  RETRIEVAL FLOW (Server → Client):                                         ║
 * ║  1. Client/server calls `getUrl(storageId)` → returns a public HTTPS URL. ║
 * ║  2. This URL is suitable for `<Image source={{ uri }}>` in React Native.  ║
 * ║                                                                            ║
 * ║  SECURITY NOTES:                                                           ║
 * ║  • `generateUploadUrl` is a mutation (requires Convex auth context).       ║
 * ║  • Upload URLs expire after a short TTL — no persistent write access.      ║
 * ║  • Storage IDs are opaque and cannot be guessed.                           ║
 * ║                                                                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authedMutation } from "./middleware";

/**
 * Generates a short-lived, single-use URL for direct file uploads.
 *
 * The client should POST the raw file body to this URL with an appropriate
 * Content-Type header. The response JSON will contain `{ storageId }`.
 *
 * @returns A temporary upload URL string (expires in ~1 hour).
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Records a successful upload in the central 'files' table.
 * Ties the storageId to a user and a purpose (tag).
 */
export const record = authedMutation({
  args: {
    storageId: v.id("_storage"),
    contentType: v.string(),
    size: v.number(),
    tag: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Identity is provided by authedMutation middleware
    const { user } = ctx;
    
    // Pattern matched from api/instances/create.ts:
    // We use the Better Auth 'id' (string) which is stored on the user document.
    const userId = user.id || user._id;

    if (!userId) {
      console.error("[Files] User object exists but no ID found:", JSON.stringify(user));
      throw new Error("UNAUTHORIZED: Could not resolve user identity from session.");
    }
    
    console.log(`[Files] Recording ${args.contentType} (${args.size} bytes) for user ${userId}, storageId: ${args.storageId}`);

    const doc: any = {
      storageId: args.storageId,
      userId: userId,
      contentType: args.contentType,
      size: args.size,
      created_at: Date.now(),
    };

    if (args.tag) doc.tag = args.tag;
    if (args.metadata) doc.metadata = args.metadata;

    const fileId = await ctx.db.insert("files", doc);
    
    return { fileId, storageId: args.storageId };
  },
});

/**
 * Converts a permanent storage reference into a publicly accessible HTTPS URL.
 *
 * Use this to display uploaded files in the UI (e.g., penalty photo preview).
 * Returns `null` if the storageId is invalid or the file has been deleted.
 *
 * @param storageId - The `Id<"_storage">` returned from a previous upload.
 * @returns A public HTTPS URL string, or `null`.
 */
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
/**
 * RECOVERY FLOW: Refreshes a temporary URL for a photo that has expired.
 * 
 * If the `photoUrl` stored on a task, instance, or preset has expired (default 1hr),
 * the client calls this with the `storageId` to get a fresh, working link.
 * 
 * DESIGN RATIONALE: This prevents the "Vanishing Photo" bug where evidence 
 * becomes unreadable after one hour. The frontend detects expiration and 
 * calls this to "refill" its temporary access pass.
 */
export const getTempUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
