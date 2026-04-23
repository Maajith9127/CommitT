import { MutationCtx, QueryCtx } from "../../_generated/server";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * IRONCLAD BOND SERVICE
 * ─────────────────────────────────────────────────────────────────────────────
 * Enforces the "Marriage" between a User Account and a Physical Device ID.
 * Once bonded, they are locked to each other until a manual "Release" occurs.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * ** VERIFY ACTIVE COMMITMENTS (FOR RELEASE) **
 */
async function hasFutureTasks(ctx: QueryCtx, userId: string): Promise<boolean> {
  const now = Date.now();
  const future = await ctx.db
    .query("taskInstances")
    .withIndex("by_assignee_start", (q) => q.eq("assignee_id", userId))
    .filter((q) => q.gt(q.field("end"), now))
    .first();
  return !!future;
}

/**
 * ** THE MARRIAGE HANDSHAKE **
 * Performs the "Is it Married?" check and establishes a bond if possible.
 */
export async function syncHardwareBondInternal(
  ctx: MutationCtx,
  userId: string,
  deviceId: string
) {
  // 1. Check if THIS ACCOUNT is already married to another phone
  let myCurrentBond = await ctx.db
    .query("userDevices")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  if (myCurrentBond && myCurrentBond.deviceId !== deviceId) {
    // ** THE PROXY-DIVORCE (Account Protection) **
    const isLocked = await hasFutureTasks(ctx, userId);
    
    if (isLocked) {
      return {
        success: false,
        reason: "Account Anchored: You have active commitments on another device.",
      };
    }
    
    // No tasks? The user likely lost/upgraded their phone. Auto-Divorce.
    await ctx.db.delete(myCurrentBond._id);
    myCurrentBond = null; // Clear state for the new marriage
  }

  // 2. Check if THIS PHONE is already married to another account
  const phoneCurrentBond = await ctx.db
    .query("userDevices")
    .withIndex("by_deviceId", (q) => q.eq("deviceId", deviceId))
    .first();

  if (phoneCurrentBond && phoneCurrentBond.userId !== userId) {
    // ** THE PROXY-DIVORCE (Hardware Protection) **
    const otherUserLocked = await hasFutureTasks(ctx, phoneCurrentBond.userId);
    
    if (otherUserLocked) {
      return {
        success: false,
        reason: "Hardware Restricted: This device is locked to another user's active commitments.",
      };
    }
    
    // No tasks? The phone was likely sold or wiped. Auto-Divorce the old owner.
    await ctx.db.delete(phoneCurrentBond._id);
  }

  // 3. ESTABLISH OR UPDATE BOND
  if (!myCurrentBond) {
    // Brand new marriage (or a remarriage after a proxy-divorce)
    await ctx.db.insert("userDevices", {
      userId,
      deviceId,
      lastSeen: Date.now(),
    });
  } else {
    // Heartbeat for existing, valid marriage
    await ctx.db.patch(myCurrentBond._id, { lastSeen: Date.now() });
  }

  return { success: true };
}
/**
 * ** THE RELEASE (DIVORCE) **
 * Breaks the bond only if no future commitments exist.
 */
export async function releaseHardwareBondInternal(ctx: MutationCtx, userId: string) {
  const isLocked = await hasFutureTasks(ctx, userId);
  
  if (isLocked) {
    throw new Error("Divorce Denied: Finish your active commitments first.");
  }

  const myBond = await ctx.db
    .query("userDevices")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  if (myBond) {
    await ctx.db.delete(myBond._id);
  }

  return { success: true };
}
