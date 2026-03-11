import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@commit/backend/convex/_generated/api";

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  useFreshPhotoUrl — The "Auto-Refill" Logic                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  PROBLEM: Convex Storage URLs (signed URLs) expire after 1 hour by default.  ║
 * ║  If a user views a task after two days, the `photoUrl` string stored in      ║
 * ║  the database will be broken (403 Forbidden).                                ║
 * ║                                                                              ║
 * ║  SOLUTION: This hook acts as a reactive gateway.                             ║
 * ║  1. It takes a `storageId` and an optional (possibly expired) `photoUrl`.    ║
 * ║  2. If the `photoUrl` is missing or we're in a fresh session, it calls       ║
 * ║     `getTempUrl` to fetch a new valid 1-hour token.                         ║
 * ║  3. It returns the fresh URL for immediate rendering in `<Image />`.        ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

export function useFreshPhotoUrl(storageId: string | undefined, initialUrl: string | undefined): string | null {
  // Use the new recovery query we just added to the backend.
  const freshUrl = useQuery(api.files.getTempUrl, storageId ? { storageId: storageId as any } : "skip" as any);

  // STRICT LOGIC:
  // 1. If we HAVE a storageId, we ONLY trust the freshUrl from the server.
  //    (We ignore the initialUrl from Zustand/SQLite because it might be expired).
  if (storageId) {
    return freshUrl || null;
  }

  // 2. If we DO NOT have a storageId, it means this is a newly picked photo
  //    that hasn't been uploaded yet. We MUST use the local file:/// URI.
  return initialUrl || null;
}
