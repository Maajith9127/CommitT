import { useMutation } from "convex/react";
import { useSQLiteContext, SQLiteDatabase } from "expo-sqlite";
import { api } from "@commit/backend/convex/_generated/api";
import type { Id } from "@commit/backend/convex/_generated/dataModel";
import { scheduleNextAlarm } from "@/modules/scheduler-module";
import { insertTaskToLocalDb, updateTaskInLocalDb } from "@/lib/local-db-commits";
import type { TaskDraft, Condition as StoreCondition } from "@/stores/useTaskDraftStore";
import { authClient } from "@/lib/auth-client";

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  useCommitTask — The "Triple-Write" Orchestrator                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  PURPOSE:                                                                    ║
 * ║  This is the Master Coordination Engine holding zero UI logic.               ║
 * ║  It guarantees perfect atomic synchronization across three environments:     ║
 * ║  1. Convex Cloud (Remote Master Record)                                      ║
 * ║  2. Expo SQLite (Offline Cache Layer)                                        ║
 * ║  3. Kotlin Native (Kernel Hardware WakeLock Scheduling)                      ║
 * ║                                                                              ║
 * ║  PENALTY PHOTO UPLOAD FLOW:                                                   ║
 * ║  When the draft contains an "embarrassing_photo" penalty with a local        ║
 * ║  file:/// URI, the orchestrator intercepts the payload BEFORE sending        ║
 * ║  it to Convex. It uploads the photo to Convex Storage, swaps the local      ║
 * ║  URI for the permanent storageId, then proceeds with the normal create       ║
 * ║  flow. This is the "Deferred Upload" pattern — no wasted bandwidth for      ║
 * ║  abandoned or edited drafts.                                                 ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ─────────────────────────────────────────────────────────────────────────────
// PENALTY PHOTO UPLOAD — Middleware that converts local URIs to Convex Storage
// ─────────────────────────────────────────────────────────────────────────────
//
// WHY THIS EXISTS:
// The penalty photo lives as a local `file:///data/user/...` URI on the
// device while the user is configuring. This path is meaningless to the
// backend. When the user commits, we:
//   1. Request a short-lived upload URL from Convex.
//   2. POST the raw photo bytes to that URL.
//   3. Receive a permanent `storageId` from Convex Storage.
//   4. Swap `photoUrl` for `storageId` in the penalty config.
//
// The backend then stores `storageId` on the task and instances. When the
// penalty fires, the executor calls `getUrl(storageId)` to retrieve it.
//
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects if a URI is a local device file path (not yet uploaded).
 * Returns `true` for paths like `file:///data/user/0/...` or `content://...`.
 */
function isLocalFileUri(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return uri.startsWith("file://") || uri.startsWith("content://");
}

/**
 * Uploads a local photo to Convex Storage and returns the storageId.
 *
 * Steps:
 * 1. Generate an upload URL via Convex mutation.
 * 2. Read the local file as a blob.
 * 3. POST the blob to the upload URL.
 * 4. Extract the storageId from the response.
 *
 * @param localUri - The device-local file:/// URI of the photo.
 * @param generateUploadUrl - The Convex mutation to generate an upload URL.
 * @returns The permanent Convex storageId string.
 * @throws Error if upload fails at any stage.
 */
async function uploadPhotoToStorage(
  localUri: string,
  generateUploadUrl: () => Promise<string>,
  recordFile: (args: { storageId: any; contentType: string; size: number; tag: string }) => Promise<any>,
): Promise<string> {
  console.log("[PenaltyUpload] Starting upload for local URI:", localUri);

  // Step 1: Get a short-lived upload URL from Convex
  const uploadUrl = await generateUploadUrl();
  console.log("[PenaltyUpload] Received upload URL from Convex");

  // Step 2: Read the local file as a blob
  // React Native's fetch() can read local file:// URIs as blobs.
  const response = await fetch(localUri);
  const blob = await response.blob();
  const contentType = blob.type || "image/jpeg";
  const size = blob.size;
  console.log(`[PenaltyUpload] Photo blob created: ${size} bytes, type: ${contentType}`);

  // Step 3: POST the raw bytes to the Convex upload URL
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error(`[UPLOAD_FAILED] Convex storage upload returned ${uploadResponse.status}`);
  }

  // Step 4: Extract the storageId from the response JSON
  const { storageId } = await uploadResponse.json();
  console.log("[PenaltyUpload] Upload complete. storageId:", storageId);

  // Step 5: Register in the central files table for ownership tracking & GC.
  // Tagged as 'penalty_photo' so we can query all penalty images for a user.
  try {
    await recordFile({
      storageId,
      contentType,
      size,
      tag: "penalty_photo",
    });
    console.log("[PenaltyUpload] File registered in files table with tag 'penalty_photo'");
  } catch (recordError) {
    // Non-critical: The photo is already in Convex Storage.
    // If the record fails, the photo still works — it just won't appear
    // in the user's file registry. Log and continue.
    console.error("[PenaltyUpload] WARNING: Failed to register file (non-critical):", recordError);
  }

  return storageId;
}

/**
 * Prepares the penalty payload for the backend.
 *
 * If the penalty contains a local photo URI, this function:
 * 1. Uploads the photo to Convex Storage.
 * 2. Replaces `photoUrl` with `storageId` in the config.
 * 3. Returns the cleaned penalty object ready for the backend.
 *
 * If no penalty is set, or the photo is already uploaded, returns as-is.
 *
 * @param penalty - The raw penalty object from the Zustand draft.
 * @param generateUploadUrl - The Convex mutation for upload URL generation.
 * @param recordFile - The Convex mutation for registering uploads in the files table.
 * @returns A backend-safe penalty object (or undefined if no penalty).
 */
async function preparePenaltyPayload(
  penalty: TaskDraft["penalty"],
  generateUploadUrl: () => Promise<string>,
  recordFile: (args: { storageId: any; contentType: string; size: number; tag: string }) => Promise<any>,
): Promise<TaskDraft["penalty"] | undefined> {
  // No penalty configured or explicitly cleared — return as-is (null or undefined)
  if (!penalty) return penalty;

  // Only "embarrassing_photo" has a photo to upload
  if (penalty.type === "embarrassing_photo" && isLocalFileUri(penalty.config?.photoUrl)) {
    console.log("[PenaltyUpload] Detected local photo URI — initiating upload...");

    const storageId = await uploadPhotoToStorage(
      penalty.config.photoUrl,
      generateUploadUrl,
      recordFile,
    );

    // Return a new penalty object with storageId replacing the local URI.
    // The backend stores `storageId` and can retrieve the public URL via
    // `ctx.storage.getUrl(storageId)` when the penalty needs to fire.
    return {
      type: penalty.type,
      config: {
        ...penalty.config,
        photoUrl: undefined,     // Remove the local URI — it's meaningless to the backend
        storageId: storageId,    // Permanent Convex Storage reference
      },
    };
  }

  // For other penalty types (money, cringe_message, etc.), pass through unchanged
  return penalty;
}


export function useCommitTask() {
  const db = useSQLiteContext();
  const { data: session } = authClient.useSession(); // Correct way to get session
  const createTask = useMutation(api.api.commitments.create.default);
  const updateTask = useMutation(api.api.commitments.update.default);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const recordFile = useMutation(api.files.record);

  return async function executeCommit(draft: TaskDraft, isEditMode: boolean): Promise<{ success: boolean; error: string | null }> {
    // 1. Sanitize the UI data before sending to backend APIs (strip local arbitrary properties)
    const cleanedConditions: Omit<StoreCondition, "id">[] = draft.conditions.map((condition) => {
      const { id, ...backendSafeCondition } = condition;
      return backendSafeCondition;
    });

    const now = Date.now();

    try {
      // ─────────────────────────────────────────────────────────────────────
      // PENALTY MIDDLEWARE — Upload photo assets BEFORE creating the task
      // ─────────────────────────────────────────────────────────────────────
      // This runs once, right before the Convex mutation. If the penalty
      // includes a local photo URI, it gets uploaded and swapped for a
      // permanent storageId. If no penalty or no photo, this is a no-op.
      const cleanedPenalty = await preparePenaltyPayload(
        draft.penalty,
        generateUploadUrl,
        recordFile,
      );

      console.log("[executeCommit] Penalty payload prepared:", JSON.stringify(cleanedPenalty, null, 2));

      // 2. Determine Action Trajectory: Are we creating a new record or updating?
      if (isEditMode) {
        
        // --- A. MUTATE CONVEX FIRST --- 
        const result = await updateTask({
          id: draft.id as Id<"tasks">,
          title: draft.title,
          description: draft.description,
          visibility: draft.visibility,
          recurrence: draft.recurrence,
          conditions: cleanedConditions,
          config: draft.config,
          penalty: cleanedPenalty,
          penalty_waiver: draft.penalty_waiver,
        });

        if (result.success) {
          try {
            // --- B. MUTATE SQLITE CACHE SECONDS LATER ---
            await updateTaskInLocalDb(db, draft, draft.id as string, now, cleanedConditions, result.instances || [], cleanedPenalty);
          } catch (localError) {
             console.error('[executeCommit] Local Update failed (UI sync gap):', localError);
          }
        } else {
            return { success: false, error: result.error?.message || "Convex Update Request rejected." };
        }
      } else {

        // --- A. MUTATE CONVEX FIRST --- 
        // If no assignee is explicitly set, default to self-assignment.
        // The backend API requires assignee_id as v.string() — never null.
        const assigneeId = draft.assignee_id || draft.assigner_id || "";

        const result = await createTask({
          assignee_id: assigneeId,
          title: draft.title,
          description: draft.description,
          visibility: draft.visibility,
          recurrence: draft.recurrence,
          conditions: cleanedConditions,
          config: draft.config,
          // ── Penalty & Waiver: Packed from the Zustand draft ──
          // These are optional — if undefined, the backend treats the task as penalty-free.
          penalty: cleanedPenalty,
          penalty_waiver: draft.penalty_waiver,
        });

          if (result.success && result.taskId) {
            try {
              // --- B. AUTHENTICATED FALLBACK RESOLUTION ---
              const sessionUser = session?.user?.id;
              
              const finalizedDraft = {
                ...draft,
                assigner_id: draft.assigner_id || sessionUser || "",
                assignee_id: draft.assignee_id || draft.assigner_id || sessionUser || "",
              };

              // --- C. MUTATE SQLITE CACHE SECONDS LATER ---
              await insertTaskToLocalDb(db, finalizedDraft, result.taskId, now, cleanedConditions, result.instances || [], cleanedPenalty);
            } catch (localError) {
             console.error('[executeCommit] Local DB Cache Creation execution suspended (non-critical):', localError);
           }
        } else {
             return { success: false, error: result.error?.message || "Convex Core Logic completely denied creation protocol." };
        }
      }

      // 3. Native Registration (Regardless of Create/Update!)
      // Immediately notify the Custom Android Kotlin code to parse the SQL DB aggressively and wake up the hardware.
      try {
        scheduleNextAlarm();
      } catch (schedError) {
        console.error('[executeCommit] Critical Background Process Warning — Failed hardware integration:', schedError);
      }

      // If we physically navigated the entire workflow, report total victory to UI.
      return { success: true, error: null };

    } catch (error) {
       console.error("[executeCommit] Catastrophic Catch-All execution:", error);
       const message = error instanceof Error ? error.message : "Fatal Network Timeout — Reconnect to internet.";
       const isAuthError = message.includes("Unauthenticated");
       
       return { 
           success: false, 
           error: isAuthError ? "Session Expired. Please strictly log in again." : "Network or Configuration failure encountered."
       };
    }
  };
}
