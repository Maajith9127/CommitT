import { useMutation } from "convex/react";
import { useSQLiteContext, SQLiteDatabase } from "expo-sqlite";
import { api } from "@commit/backend/convex/_generated/api";
import type { Id } from "@commit/backend/convex/_generated/dataModel";
import { scheduleNextAlarm } from "@/modules/scheduler-module";
import { insertTaskToLocalDb, updateTaskInLocalDb } from "@/lib/local-db-commits";
import { syncLock } from "@/lib/sync-lock";
import { Logger } from "@/lib/logger";
import type { TaskDraft, Condition as StoreCondition } from "@/stores/useTaskDraftStore";
import { authClient } from "@/lib/auth-client";

/**
 * useCommitTask - The "Triple-Write" Orchestrator
 *
 * PURPOSE:
 * This is the Master Coordination Engine holding zero UI logic.
 * It guarantees perfect atomic synchronization across three environments:
 * 1. Convex Cloud (Remote Master Record)
 * 2. Expo SQLite (Offline Cache Layer)
 * 3. Kotlin Native (Kernel Hardware WakeLock Scheduling)
 *
 * PENALTY PHOTO UPLOAD FLOW:
 * When the draft contains an "embarrassing_photo" penalty with a local
 * file:/// URI, the orchestrator intercepts the payload BEFORE sending
 * it to Convex. It uploads the photo to Convex Storage, swaps the local
 * URI for the permanent storageId, then proceeds with the normal create
 * flow. This is the "Deferred Upload" pattern - no wasted bandwidth for
 * abandoned or edited drafts.
 */

/**
 * PENALTY PHOTO UPLOAD - Middleware that converts local URIs to Convex Storage
 *
 * WHY THIS EXISTS:
 * The penalty photo lives as a local `file:///data/user/...` URI on the
 * device while the user is configuring. This path is meaningless to the
 * backend. When the user commits, we:
 *   1. Request a short-lived upload URL from Convex.
 *   2. POST the raw photo bytes to that URL.
 *   3. Receive a permanent `storageId` from Convex Storage.
 *   4. Swap `photoUrl` for `storageId` in the penalty config.
 *
 * The backend then stores `storageId` on the task and instances. When the
 * penalty fires, the executor calls `getUrl(storageId)` to retrieve it.
 */

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


import { TripleWriteOrchestrator } from "@/lib/triple-write-orchestrator";
import { getLocalSyncToken, ingestDeltaPayload } from "@/lib/sync-engine";
import { useConvex } from "convex/react";
import { useChaosStore } from "@/stores/useChaosStore";
import { useHealStore } from "@/stores/useHealStore";

export function useCommitTask() {
  const db = useSQLiteContext();
  const convex = useConvex(); // Used for the direct Auto-Heal Sync Pipeline
  const { data: session } = authClient.useSession();
  const createTask = useMutation(api.api.commitments.create.default);
  const updateTask = useMutation(api.api.commitments.update.default);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const recordFile = useMutation(api.files.record);

  const { startHealing, stopHealing } = useHealStore();

  /**
   * @saga    TASK_CREATION_ORCHESTRATOR
   * @desc    Coordinates the multi-stage creation or update of a commitment across Cloud, Disk, and Hardware.
   * @access  Public (from wizard finalization)
   *
   * Flow:
   * 1. Sanitize UI Data: Strip temporary local IDs from conditions.
   * 2. Evaluate Penalties: Upload media assets (Voice/Video) to Convex storage if required.
   * 3. Cloud Sync (Step 1): Execute Convex mutation to save the task and generate instances.
   * 4. Forward-Heal Loop (Step 1 Compensation):
   *    - If cloud succeeds but device fails, enter blocking retry loop.
   *    - Wipe stale local instances.
   *    - Pull fresh Delta Payload and ingest into SQLite.
   *    - Realign Hardware Alarms.
   * 5. Disk Sync (Step 2): Update the local SQLite mirror.
   * 6. Hardware Sync (Step 3): Schedule the next OS-level alarm.
   *
   * Note:
   * - Once Cloud confirmation is received, the operation is considered successful.
   * - Infinite retry loop prevents "Split-Brain" states on flaky devices.
   */
  return async function executeCommit(draft: TaskDraft, isEditMode: boolean): Promise<{ success: boolean; error: string | null }> {
    // 1. Sanitize UI Data for Backend
    const cleanedConditions: Omit<StoreCondition, "id">[] = draft.conditions.map((condition) => {
      const { id, ...backendSafeCondition } = condition;
      return backendSafeCondition;
    });

    const now = Date.now();
    const sessionUser = session?.user?.id;
    const finalizedDraft = {
      ...draft,
      assigner_id: draft.assigner_id || sessionUser || "",
      assignee_id: draft.assignee_id || draft.assigner_id || sessionUser || "",
    };

    try {
      /**
       * MIDDLEWARE: Ensure media assets are uploaded before freezing data.
       */
      const cleanedPenalty = await preparePenaltyPayload(
        draft.penalty,
        generateUploadUrl,
        recordFile,
      );

      console.log("[executeCommit] Penalty evaluated/uploaded resolving into ContextSnapshot.");

      /**
       * SAGA ARCHITECTURE: The Triple-Write Black Box
       * We freeze the intent here. Unpredictable UI states will no longer affect the engine.
       */
      const contextSnapshot = {
        draft: finalizedDraft,
        now,
        cleanedConditions,
        cleanedPenalty,
        isEditMode
      };

      const orchestrator = new TripleWriteOrchestrator(contextSnapshot);

      orchestrator
        .addStep(
          "Cloud Write (Convex)",
          async (ctx) => {
            if (__DEV__ && useChaosStore.getState().faultCloudWrite) throw new Error("[CHAOS EVENT] Cloud Write artificially crashed!");
            if (ctx.isEditMode) {
              const mappedRecurrence = {
                ...ctx.draft.recurrence,
                time_windows: ctx.draft.recurrence.time_windows.map(w => ({
                  start: w.start,
                  end: w.end,
                  conditions: w.conditions,
                  ruleId: w.ruleId,
                  // Explicit mapping of the behavioral rule label to the backend payload.
                  // This ensures the custom rule name (e.g., 'T-rex') is persisted.
                  ruleName: w.ruleName,
                  config: w.ruleConfig,
                  ruleConfig: w.ruleConfig,
                }))
              };
              const result = await updateTask({
                id: ctx.draft.id as Id<"tasks">,
                title: ctx.draft.title,
                description: ctx.draft.description,
                visibility: ctx.draft.visibility,
                recurrence: mappedRecurrence,
                conditions: ctx.cleanedConditions,
                config: ctx.draft.config,
                penalty: ctx.cleanedPenalty,
                penalty_waiver: ctx.draft.penalty_waiver,
              });
              if (!result.success) throw new Error(result.error?.message || "Convex Core Logic denied protocol.");
              return { taskId: ctx.draft.id, instances: result.instances || [] };
            } else {
              const mappedRecurrence = {
                ...ctx.draft.recurrence,
                time_windows: ctx.draft.recurrence.time_windows.map(w => ({
                  start: w.start,
                  end: w.end,
                  conditions: w.conditions,
                  ruleId: w.ruleId,
                  // Synchronizing frontend draft labels with backend persistence schema.
                  ruleName: w.ruleName,
                  config: w.ruleConfig,
                  ruleConfig: w.ruleConfig,
                }))
              };
              const result = await createTask({
                assignee_id: ctx.draft.assignee_id,
                title: ctx.draft.title,
                description: ctx.draft.description,
                visibility: ctx.draft.visibility,
                recurrence: mappedRecurrence,
                conditions: ctx.cleanedConditions,
                config: ctx.draft.config,
                penalty: ctx.cleanedPenalty,
                penalty_waiver: ctx.draft.penalty_waiver,
              });
              if (!result.success || !result.taskId) throw new Error(result.error?.message || "Convex Core Logic completely denied creation protocol.");
              return { taskId: result.taskId, instances: result.instances || [] };
            }
          },
          async (ctx, cloudMemory) => {
             // FORWARD-HEAL: We no longer revert the cloud. 
             startHealing("Cloud save verified. Synchronizing your device...");
             
             const taskId = cloudMemory.taskId;
             let attempts = 0;

             while (true) {
               try {
                 attempts++;
                 if (attempts > 1) {
                   startHealing(`Retrying Sync (Attempt ${attempts})...`);
                 }
                 
                 Logger.info(`[HealLoop] Attempting Forward-Heal for Task ${taskId} (Attempt ${attempts})`);
                 
                 /**
                  * SYNC LOCK ACQUISITION (HEAL LOOP)
                  * 
                  * The Heal Loop downloads and ingests massive chunks of data.
                  * We must lock the DB here to prevent the Background Engine
                  * from running its own ingestion at the exact same millisecond.
                  */
                 await syncLock.execute("Saga:ForwardHeal", async () => {
                   // 1. Targeted Purge
                   await db.runAsync('DELETE FROM task_instances WHERE task_id = ?', [taskId]);
                   
                   // 2. Fetch Sync Token
                   let token = await getLocalSyncToken();
                   
                   // 3. Request Delta 
                   const payload = await convex.query(api.api.sync.delta.getDeltaPayload, { 
                     last_synced_at: token || undefined 
                   });
                   
                   // 4. Ingest Delta
                   await ingestDeltaPayload(db, payload);
                   
                   // 5. Success! Re-calculate hardware
                   scheduleNextAlarm();
                 });
                 
                 Logger.info(`[HealLoop] Forward-Heal successful on attempt ${attempts}.`);
                 break;
                 
               } catch (error) {
                 Logger.error(`[HealLoop] Attempt ${attempts} failed:`, error);
                 await new Promise(r => setTimeout(r, 2000));
               }
             }
             
             stopHealing();
          }
        )
        .addStep(
          "Local Sync (Disk + Hardware)",
          async (ctx, prevResults) => {
            if (__DEV__ && useChaosStore.getState().faultDiskWrite) throw new Error("[CHAOS EVENT] Local DB corrupted during Disk Write!");
            if (__DEV__ && useChaosStore.getState().faultHardware) throw new Error("[CHAOS EVENT] Hardware Alarm Permission Denied!");

            const cloudMemory = prevResults["Cloud Write (Convex)"];
            
            /**
             * SYNC LOCK ACQUISITION (MAIN SAGA)
             * 
             * CRITICAL MERGE: We combine the SQLite Write and the Kotlin 
             * Alarm trigger into a SINGLE Locked operation. 
             * This completely prevents the "Phantom Overwrite" bug where the 
             * Background Engine modifies the Database in the split-second 
             * before the Saga manages to update the hardware alarms.
             */
            await syncLock.execute("Saga:CommitTask", async () => {
              if (ctx.isEditMode) {
                await updateTaskInLocalDb(db, ctx.draft, cloudMemory.taskId, ctx.now, ctx.cleanedConditions, cloudMemory.instances, ctx.cleanedPenalty);
              } else {
                await insertTaskToLocalDb(db, ctx.draft, cloudMemory.taskId, ctx.now, ctx.cleanedConditions, cloudMemory.instances, ctx.cleanedPenalty);
              }
              
              Logger.info('[Saga:CommitTask] Disk Write finished. Firing Hardware Kernel...');
              scheduleNextAlarm();
            });

            return { locked: true };
          },
          async () => {
             Logger.info("[Saga] Local Sync succeeded/failed. Rollback skipped.");
          }
        );

      // Execute the Master Saga Coordinator
      const executionResult = await orchestrator.execute();

      /**
       * THE IMPERIAL SUCCESS CHECK
       * 
       * In our Forward-Heal model, if the Cloud Write succeeded, the Heal Loop
       * guarantees that Disk and Hardware are also fixed before we return.
       * Therefore, even if the Orchestrator technically "failed" its initial
       * sequence, the system is now consistent and we return SUCCESS.
       */
      const cloudWriteSuccess = !!executionResult.results["Cloud Write (Convex)"];
      const finalSuccess = executionResult.success || cloudWriteSuccess;
      const finalError = finalSuccess ? null : executionResult.error;

      return { success: finalSuccess, error: finalError };

    } catch (error) {
       console.error("[executeCommit] Uncaught Middleware Exception:", error);
       const message = error instanceof Error ? error.message : "Fatal Config Error.";
       const isAuthError = message.includes("Unauthenticated");
       
       return { 
           success: false, 
           error: isAuthError ? "Session Expired. Please strictly log in again." : "Middleware failed prior to Orchestrator execution."
       };
    }
  };
}
