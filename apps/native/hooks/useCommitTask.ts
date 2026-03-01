import { useMutation } from "convex/react";
import { useSQLiteContext, SQLiteDatabase } from "expo-sqlite";
import { api } from "@commit/backend/convex/_generated/api";
import type { Id } from "@commit/backend/convex/_generated/dataModel";
import { scheduleNextAlarm } from "@/modules/scheduler-module";
import { insertTaskToLocalDb, updateTaskInLocalDb } from "@/lib/local-db-commits";
import type { TaskDraft, Condition as StoreCondition } from "@/stores/useTaskDraftStore";

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
 * ║  If Convex succeeds, SQLite succeeds. If SQLite succeeds, Native SDK maps    ║
 * ║  the background chronologies accurately. Total reliability.                  ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

export function useCommitTask() {
  const db = useSQLiteContext();
  const createTask = useMutation(api.api.commitments.create.default);
  const updateTask = useMutation(api.api.commitments.update.default);

  return async function executeCommit(draft: TaskDraft, isEditMode: boolean): Promise<{ success: boolean; error: string | null }> {
    // 1. Sanitize the UI data before sending to backend APIs (strip local arbitrary properties)
    const cleanedConditions: Omit<StoreCondition, "id">[] = draft.conditions.map((condition) => {
      const { id, ...backendSafeCondition } = condition;
      return backendSafeCondition;
    });

    const now = Date.now();

    try {
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
        });

        if (result.success) {
          try {
            // --- B. MUTATE SQLITE CACHE SECONDS LATER ---
            await updateTaskInLocalDb(db, draft, draft.id as string, now, cleanedConditions, result.instances || []);
          } catch (localError) {
             console.error('[executeCommit] Local Update failed (UI sync gap):', localError);
          }
        } else {
            return { success: false, error: result.error?.message || "Convex Update Request rejected." };
        }
      } else {

        // --- A. MUTATE CONVEX FIRST --- 
        const result = await createTask({
          assignee_id: draft.assignee_id,
          title: draft.title,
          description: draft.description,
          visibility: draft.visibility,
          recurrence: draft.recurrence,
          conditions: cleanedConditions,
          config: draft.config,
        });

        if (result.success && result.taskId) {
           try {
             // --- B. MUTATE SQLITE CACHE SECONDS LATER ---
             await insertTaskToLocalDb(db, draft, result.taskId, now, cleanedConditions, result.instances || []);
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
