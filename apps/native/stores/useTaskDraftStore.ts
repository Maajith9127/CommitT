import { create } from "zustand";
import { nanoid } from "nanoid/non-secure";

// Import Convex-generated types - single source of truth for backend schema
import type { Doc } from "@commit/backend/convex/_generated/dataModel";

/* -----------------------------
   Types - Derived from Convex Schema
--------------------------------*/

// Extract core types from Convex schema
type ConvexTask = Doc<"tasks">;

// Re-export Convex types for use elsewhere
export type Recurrence = ConvexTask["recurrence"];
export type TimeWindow = Recurrence["time_windows"][number] & {
  ruleId?: string;
  ruleName?: string;
  ruleConfig?: any;
};
export type RecurrenceType = Recurrence["type"];
export type RecurrenceEnds = NonNullable<Recurrence["ends"]>;

// Condition types from Convex, with UI extension
type ConvexCondition = ConvexTask["conditions"][number];
export type ConditionRelation = ConvexCondition["relation"];
export type ConditionTargetType = ConvexCondition["target"]["type"];

// Extended Condition with UI-only fields
export type Condition = ConvexCondition & {
  id: string; // frontend-only, for React list keys
};

// Visibility type from Convex
export type Visibility = ConvexTask["visibility"];

// Config type from Convex
export type TaskConfig = ConvexTask["config"];


/* ----------------------------- liek 
   TaskDraft - Frontend-only Type
--------------------------------*/

/**
 * TaskDraft is the frontend representation of a task being created/edited.
 * It mirrors the Convex schema but includes:
 * - UI-only fields (cameraTarget, condition ids)
 * - Nullable assignment fields (filled during creation flow)
 */
export type TaskDraft = {
  id: string; // local draft ID (not persisted to Convex)

  // Assignment (frontend-controlled, nullable until set)
  assigner_id: string | null;
  assignee_id: string | null;

  // Core details (matches Convex schema)
  title: string;
  description?: string;
  visibility: Visibility;

  // Recurrence (matches Convex schema exactly)
  recurrence: Recurrence;

  // Time window (legacy/session-specific, not in main Convex schema)
  time_window: {
    start_at: number | null;
    due_at: number | null;
  };

  // Conditions with UI extension (id for React keys)
  conditions: Condition[];

  // Task Configuration (matches Convex schema)
  config: TaskConfig;

  /**
   * Penalty Configuration: Defines the forfeit consequence for the task.
   * Matches Doc<"taskInstances">["penalty"] discriminator pattern.
   * Example: { type: "embarrassing_photo", config: { photoUrl, ... } }
   */
  penalty?: {
    type: "embarrassing_photo" | "send_email" | "send_money" | "commit_direct";
    config: any;
  } | null;

  /**
   * Penalty Waiver: Defines governance/consensus rules for waiving a penalty.
   */
  penalty_waiver?: {
    type: "captcha" | "paragraph";
    config: any;
    deadline_minutes: number;
  } | null;

  // UI-only: camera target for map components
  cameraTarget: {
    latitude: number;
    longitude: number;
    zoom?: number;
    tilt?: number;
    bearing?: number;
  } | null;
  isAccountabilityPrefilled: boolean;
};

/* -----------------------------
   Store
--------------------------------*/

type TaskDraftStore = {
  draft: TaskDraft;

  // setters
  setTitle: (title: string) => void;
  setDescription: (description?: string) => void;
  setVisibility: (visibility: TaskDraft["visibility"]) => void;
  setAssigner: (userId: string | null) => void;
  setAssignee: (userId: string | null) => void;

  setStartAt: (timestamp: number | null) => void;
  setDueAt: (timestamp: number | null) => void;

  // recurrence
  setRecurrence: (updates: Partial<Recurrence>) => void;
  setTimeWindows: (windows: TimeWindow[]) => void;
  addTimeWindow: (window: TimeWindow) => void;
  removeTimeWindow: (index: number) => void;
  updateTimeWindow: (index: number, window: TimeWindow) => void;

  // location
  setLocation: (updates: { latitude: number; longitude: number; radius: number; address: string; isInverse: boolean } | null) => void;
  setCameraTarget: (target: TaskDraft["cameraTarget"]) => void;

  // conditions
  addCondition: (condition: Omit<Condition, "id">) => void;
  updateCondition: (id: string, updates: Partial<Condition>) => void;
  removeCondition: (id: string) => void;
  clearConditions: () => void;

  // lifecycle
  resetDraft: () => void;
  setDraft: (draft: Partial<TaskDraft>) => void;
  setConfig: (updates: Partial<TaskConfig>) => void;
  setWaiver: (updates: Partial<NonNullable<TaskDraft["penalty_waiver"]>>) => void;
  // blocklist
  setBlocklist: (updates: { apps?: string[]; websites?: string[] }) => void;
  // slot-specific conditions
  setSlotLocation: (index: number, location: { latitude: number; longitude: number; radius: number; address: string; isInverse: boolean; id?: string } | null) => void;
  setSlotBlocklist: (index: number, updates: { apps?: string[]; websites?: string[]; id?: string }) => void;
  setSlotRule: (index: number, rule: { id: string; name: string; config: any } | null) => void;
};

const createEmptyDraft = (): TaskDraft => ({
  id: "",

  assigner_id: null,
  assignee_id: null,

  title: "",
  description: "Do the Habit",
  visibility: "private",

  recurrence: {
    type: "once",
    interval: 1,
    time_windows: [],  // Required - starts empty
  },

  time_window: {
    start_at: null,
    due_at: null,
  },

  conditions: [],
  penalty: {
    type: "embarrassing_photo",
    config: {
      channel: "email",
      emailTo: "",
    },
  },
  penalty_waiver: {
    type: "captcha",
    config: {
      count: 5,
      difficulty: "medium",
    },
    deadline_minutes: 60,
  },
  config: {
    verification_style: "just_show_up",
    grace_period_minutes: 10,
    alarms: {
      lead_time_minutes: 30,
      interval_minutes: 5,
      sound_key: "Default",
    },
  },
  cameraTarget: null,
  isAccountabilityPrefilled: false,
});

// Logger middleware - pretty-print state in schema format
/**
 * @middleware logger
 * @description Injects console visibility into store updates.
 * In a production environment, this is typically wrapped in early-return logic 
 * to ensure logs only appear during debug sessions.
 */
const logger = (config: any) => (set: any, get: any, api: any) =>
  config(
    (...args: any[]) => {
      const actionName = args[2] ?? "anonymous";
      
      // Execute state mutation
      set(...args);
      
      // Post-mutation visibility
      const d = get().draft;
      
      console.log(`\n[Zustand] 🔄 ${actionName}`);
      console.log("─────────────────────────────────────────────────────────");
      console.log(JSON.stringify(d, null, 2));
      console.log("─────────────────────────────────────────────────────────\n");
      console.log("─────────────────────────────────────────────────────────\n");
    },
    get,
    api
  );

export const useTaskDraftStore = create<TaskDraftStore>()(
  logger((set) => ({
    draft: createEmptyDraft(),

    // -----------------
    // basic setters
    // -----------------
    setTitle: (title: string) =>
      set(
        (state: TaskDraftStore) => ({
          draft: { ...state.draft, title },
        }),
        false,
        "draft/setTitle"
      ),
      
    setDescription: (description?: string) =>
      set(
        (state: TaskDraftStore) => ({
          draft: { ...state.draft, description },
        }),
        false,
        "draft/setDescription"
      ),

    setAssigner: (userId: string | null) =>
      set(
        (state: TaskDraftStore) => ({
          draft: { ...state.draft, assigner_id: userId },
        }),
        false,
        "draft/setAssigner"
      ),

    setVisibility: (visibility: TaskDraft["visibility"]) =>
      set(
        (state: TaskDraftStore) => ({
          draft: { ...state.draft, visibility },
        }),
        false,
        "draft/setVisibility"
      ),

    setAssignee: (userId: string | null) =>
      set(
        (state: TaskDraftStore) => ({
          draft: { ...state.draft, assignee_id: userId },
        }),
        false,
        "draft/setAssignee"
      ),

    setStartAt: (timestamp: number | null) =>
      set(
        (state: TaskDraftStore) => ({
          draft: {
            ...state.draft,
            time_window: {
              ...state.draft.time_window,
              start_at: timestamp,
            },
          },
        }),
        false,
        "draft/setStartAt"
      ),

    setDueAt: (timestamp: number | null) =>
      set(
        (state: TaskDraftStore) => ({
          draft: {
            ...state.draft,
            time_window: {
              ...state.draft.time_window,
              due_at: timestamp,
            },
          },
        }),
        false,
        "draft/setDueAt"
      ),

    setRecurrence: (updates: Partial<Recurrence>) =>
      set(
        (state: TaskDraftStore) => {
          // Merge updates
          const newRecurrence = { ...state.draft.recurrence, ...updates };

          // 1. Logic for Weekly vs Once based on Days
          // If days are selected, it implies "Weekly" (recur on these days)
          if (newRecurrence.days_of_week && newRecurrence.days_of_week.length > 0) {
            newRecurrence.type = "weekly";
            
            // 2. Intelligent "Ends" Strategy
            // If explicit "Repeat Forever" is NOT set (ends.type != "never"),
            // we default to "Run limited times" (No Repeat mode).
            // Count = number of days selected (e.g., M,W,F = 3 instances for this week).
            if (newRecurrence.ends?.type !== "never") {
               const numDays = newRecurrence.days_of_week.length;
               const numSlots = newRecurrence.time_windows?.length || 0;
               const totalCount = numDays * numSlots;
               
               newRecurrence.ends = {
                 type: "after",
                 count: totalCount > 0 ? totalCount : 1
               };
            }
          } 
          // 3. If no days, revert to Once (unless explicitly Daily/Monthly)
          else if (newRecurrence.type !== "daily" && (!newRecurrence.days_of_week || newRecurrence.days_of_week.length === 0)) {
            newRecurrence.type = "once";
            // Once tasks don't have 'ends' (they end after 1)
            delete newRecurrence.ends;
            delete newRecurrence.days_of_week;
          }

          return {
            draft: {
              ...state.draft,
              recurrence: newRecurrence,
            },
          };
        },
        false,
        "draft/setRecurrence"
      ),

    // -----------------
    // time windows (in recurrence)
    // -----------------
    setTimeWindows: (windows: TimeWindow[]) =>
      set(
        (state: TaskDraftStore) => ({
          draft: {
            ...state.draft,
            recurrence: {
              ...state.draft.recurrence,
              time_windows: windows,
              ends: state.draft.recurrence.ends?.type === "after" 
                ? { 
                    type: "after", 
                    count: Math.max(1, (state.draft.recurrence.days_of_week?.length || 0) * windows.length) 
                  }
                : state.draft.recurrence.ends
            },
          },
        }),
        false,
        "draft/setTimeWindows"
      ),

    addTimeWindow: (window: TimeWindow) =>
      set(
        (state: TaskDraftStore) => ({
          draft: {
            ...state.draft,
            recurrence: {
              ...state.draft.recurrence,
              time_windows: [...state.draft.recurrence.time_windows, window],
              ends: state.draft.recurrence.ends?.type === "after" 
                ? { 
                    type: "after", 
                    count: Math.max(1, (state.draft.recurrence.days_of_week?.length || 0) * (state.draft.recurrence.time_windows.length + 1)) 
                  }
                : state.draft.recurrence.ends
            },
          },
        }),
        false,
        "draft/addTimeWindow"
      ),

    removeTimeWindow: (index: number) =>
      set(
        (state: TaskDraftStore) => ({
          draft: {
            ...state.draft,
            recurrence: {
              ...state.draft.recurrence,
              time_windows: state.draft.recurrence.time_windows.filter((_, i) => i !== index),
              ends: state.draft.recurrence.ends?.type === "after" 
                ? { 
                    type: "after", 
                    count: Math.max(1, (state.draft.recurrence.days_of_week?.length || 0) * (state.draft.recurrence.time_windows.length - 1)) 
                  }
                : state.draft.recurrence.ends
            },
          },
        }),
        false,
        "draft/removeTimeWindow"
      ),

    updateTimeWindow: (index: number, window: TimeWindow) =>
      set(
        (state: TaskDraftStore) => ({
          draft: {
            ...state.draft,
            recurrence: {
              ...state.draft.recurrence,
              time_windows: state.draft.recurrence.time_windows.map((w, i) =>
                i === index ? window : w
              ),
            },
          },
        }),
        false,
        "draft/updateTimeWindow"
      ),

    // -----------------
    // location
    // -----------------
    setLocation: (updates: { latitude: number; longitude: number; radius: number; address: string; isInverse: boolean } | null) =>
      set(
        (state: TaskDraftStore) => {
          let updatedConditions = [...state.draft.conditions];
          
        if (updates) {
          let index = -1;
          for (let i = 0; i < updatedConditions.length; i++) {
            if (updatedConditions[i].metric_key === "location") {
              index = i;
              break;
            }
          }
          const locationCondition: Condition = {
              id: index >= 0 ? updatedConditions[index].id : nanoid(),
              metric_key: "location",
              relation: updates.isInverse ? "outside" : "within",
              target: {
                type: "number",
                value: {
                  lat: updates.latitude,
                  lng: updates.longitude,
                  radius: updates.radius,
                  address: updates.address, // Kept for UI display in the condition target
                },
              },
            };
            
            if (index >= 0) {
              updatedConditions[index] = locationCondition;
            } else {
              updatedConditions.push(locationCondition);
            }
          } else {
            updatedConditions = updatedConditions.filter((c: Condition) => c.metric_key !== "location");
          }

          return {
            draft: { 
              ...state.draft, 
              conditions: updatedConditions,
              updated_at: Date.now()
            },
          };
        },
        false,
        "draft/setLocation"
      ),

    setCameraTarget: (target: TaskDraft["cameraTarget"]) =>
      set(
        (state: TaskDraftStore) => ({
          draft: { ...state.draft, cameraTarget: target },
        }),
        false,
        "draft/setCameraTarget"
      ),

    addCondition: (condition: Omit<Condition, "id">) =>
      set(
        (state: TaskDraftStore) => ({
          draft: {
            ...state.draft,
            conditions: [...state.draft.conditions, { ...condition, id: nanoid() }],
          },
        }),
        false,
        "draft/addCondition"
      ),

    updateCondition: (id: string, updates: Partial<Condition>) =>
      set(
        (state: TaskDraftStore) => ({
          draft: {
            ...state.draft,
            conditions: state.draft.conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
          },
        }),
        false,
        "draft/updateCondition"
      ),

    removeCondition: (id: string) =>
      set(
        (state: TaskDraftStore) => ({
          draft: {
            ...state.draft,
            conditions: state.draft.conditions.filter((c) => c.id !== id),
          },
        }),
        false,
        "draft/removeCondition"
      ),

    clearConditions: () =>
      set(
        (state: TaskDraftStore) => ({
          draft: { ...state.draft, conditions: [] },
        }),
        false,
        "draft/clearConditions"
      ),

    // -----------------
    // lifecycle
    // -----------------
    resetDraft: () =>
      set(
        () => ({
          draft: createEmptyDraft(),
        }),
        false,
        "draft/resetDraft"
      ),
      
    setDraft: (newDraft: Partial<TaskDraft>) =>
      set(
        (state: TaskDraftStore) => {
          const conditions = newDraft.conditions
            ? newDraft.conditions.map((c) => ({ ...c, id: c.id || nanoid() }))
            : state.draft.conditions;

          // Auto-Hydration: If recurrence exists, ensure slot-level 'ruleConfig' is populated
          // from the database 'config' field if missing. This prevents UI data loss
          // for legacy tasks or during schema transitions.
          let recurrence = newDraft.recurrence || state.draft.recurrence;
          if (recurrence?.time_windows) {
            recurrence = {
              ...recurrence,
              time_windows: recurrence.time_windows.map((w: any) => ({
                ...w,
                ruleConfig: w.ruleConfig || w.config,
              }))
            };
          }

          return {
            draft: { ...state.draft, ...newDraft, recurrence, conditions },
          };
        },
        false,
        "draft/setDraft"
      ),

    setConfig: (updates: Partial<TaskConfig>) =>
      set(
        (state: TaskDraftStore) => ({
          draft: {
            ...state.draft,
            config: {
              ...state.draft.config,
              ...updates,
              // Nested merge for alarms if provided
              alarms: updates.alarms
                ? { ...state.draft.config.alarms, ...updates.alarms }
                : state.draft.config.alarms,
            },
          },
        }),
        false,
        "draft/setConfig"
      ),

    setWaiver: (updates: Partial<NonNullable<TaskDraft["penalty_waiver"]>>) =>
      set(
        (state: TaskDraftStore) => {
          const currentWaiver = state.draft.penalty_waiver || {
            type: "captcha",
            config: {},
            deadline_minutes: 60, // Default to 1 hour
          };

          return {
            draft: {
              ...state.draft,
              penalty_waiver: {
                ...currentWaiver,
                ...updates,
                config: {
                  ...currentWaiver.config,
                  ...(updates.config || {}),
                },
              },
            },
          };
        },
        false,
        "draft/setWaiver"
      ),

    setBlocklist: (updates: { apps?: string[]; websites?: string[] }) =>
      set(
        (state: TaskDraftStore) => {
          let updatedConditions = [...state.draft.conditions];
          let index = -1;
          for (let i = 0; i < updatedConditions.length; i++) {
            if (updatedConditions[i].metric_key === "digital_commitment") {
              index = i;
              break;
            }
          }
          
          const currentTarget = index >= 0 && updatedConditions[index].target.type === "array" 
            ? (updatedConditions[index].target.value as { apps: string[]; websites: string[] })
            : { apps: [], websites: [] };
          
          const newApps = updates.apps ?? currentTarget.apps;
          const newWebs = updates.websites ?? currentTarget.websites;

          // If both are empty, remove the condition
          if (newApps.length === 0 && newWebs.length === 0) {
            updatedConditions = updatedConditions.filter((c: Condition) => c.metric_key !== "digital_commitment");
          } else {
            const blockCondition: Condition = {
              id: index >= 0 ? updatedConditions[index].id : nanoid(),
              metric_key: "digital_commitment",
              relation: "outside",
              target: {
                type: "array",
                value: {
                  apps: newApps,
                  websites: newWebs,
                },
              },
            };

            if (index >= 0) {
              updatedConditions[index] = blockCondition;
            } else {
              updatedConditions.push(blockCondition);
            }
          }

          return {
            draft: {
              ...state.draft,
              conditions: updatedConditions,
            },
          };
        },
        false,
        "draft/setBlocklist"
      ),
      
    // -----------------
    // slot-specific conditions
    // -----------------
    setSlotLocation: (index: number, location) =>
      set(
        (state: TaskDraftStore) => {
          const windows = [...state.draft.recurrence.time_windows];
          if (!windows[index]) return state;

          const currentConditions = windows[index].conditions || [];
          let updatedConditions = [...currentConditions];

          if (location) {
            const locCondition: any = {
              metric_key: "location",
              relation: location.isInverse ? "outside" : "within",
              target: {
                type: "number",
                value: {
                  id: location.id, // Store source ID for toggle resolution
                  lat: location.latitude,
                  lng: location.longitude,
                  radius: location.radius,
                  address: location.address,
                },
              },
            };

            const idx = updatedConditions.findIndex(c => c.metric_key === "location");
            if (idx >= 0) updatedConditions[idx] = locCondition;
            else updatedConditions.push(locCondition);
          } else {
            updatedConditions = updatedConditions.filter(c => c.metric_key !== "location");
          }

          windows[index] = { 
            ...windows[index], 
            conditions: updatedConditions.length > 0 ? updatedConditions : undefined 
          };

          return { 
            draft: { 
              ...state.draft, 
              recurrence: { ...state.draft.recurrence, time_windows: windows } 
            } 
          };
        },
        false,
        "draft/setSlotLocation"
      ),

    setSlotBlocklist: (index: number, updates) =>
      set(
        (state: TaskDraftStore) => {
          const windows = [...state.draft.recurrence.time_windows];
          if (!windows[index]) return state;

          const currentConditions = windows[index].conditions || [];
          let updatedConditions = [...currentConditions];

          const idx = updatedConditions.findIndex(c => c.metric_key === "digital_commitment");
          const currentTarget = idx >= 0 && updatedConditions[idx].target.type === "array"
            ? (updatedConditions[idx].target.value as { apps: string[]; websites: string[] })
            : { apps: [], websites: [] };

          const newApps = updates.apps ?? currentTarget.apps;
          const newWebs = updates.websites ?? currentTarget.websites;

          if (newApps.length === 0 && newWebs.length === 0) {
            updatedConditions = updatedConditions.filter(c => c.metric_key !== "digital_commitment");
          } else {
            const blockCondition: any = {
              metric_key: "digital_commitment",
              relation: "outside",
              target: {
                type: "array",
                value: {
                  id: updates.id, // Store source ID for toggle resolution
                  apps: newApps,
                  websites: newWebs,
                },
              },
            };

            if (idx >= 0) updatedConditions[idx] = blockCondition;
            else updatedConditions.push(blockCondition);
          }

          windows[index] = { 
            ...windows[index], 
            conditions: updatedConditions.length > 0 ? updatedConditions : undefined 
          };

          return { 
            draft: { 
              ...state.draft, 
              recurrence: { ...state.draft.recurrence, time_windows: windows } 
            } 
          };
        },
        false,
        "draft/setSlotBlocklist"
      ),
      
    setSlotRule: (index: number, rule: { id: string; name: string; config: any } | null) =>
      set(
        (state: TaskDraftStore) => {
          const windows = [...state.draft.recurrence.time_windows];
          if (!windows[index]) return state;

          windows[index] = { 
            ...windows[index], 
            ruleId: rule?.id,
            ruleName: rule?.name,
            ruleConfig: rule?.config 
          };

          return { 
            draft: { 
              ...state.draft, 
              recurrence: { ...state.draft.recurrence, time_windows: windows } 
            } 
          };
        },
        false,
        "draft/setSlotRule"
      ),
  }))
);
