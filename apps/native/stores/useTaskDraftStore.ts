import { create } from "zustand";
import { nanoid } from "nanoid/non-secure";

/* -----------------------------
   Types
--------------------------------*/

export type ConditionRelation =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "within"
  | "outside"
  | "exists"
  | "matches";

export type ConditionTargetType = "number" | "string" | "boolean" | "array" | "range" | "object";

export type Condition = {
  id: string; // frontend-only, for list rendering
  metric_key: string;
  relation: ConditionRelation;
  target: {
    type: ConditionTargetType;
    value: any;
  };
};

export type RecurrenceType = "once" | "daily" | "weekly" | "monthly" | "yearly" | "custom";

export type RecurrenceEnds = {
  type: "never" | "after" | "on";
  count?: number;
  date?: number; // timestamp
};

export type Recurrence = {
  type: RecurrenceType;
  interval: number;
  days_of_week?: number[];
  ends?: RecurrenceEnds;
};

export type TaskDraft = {
  id: string;

  // assignment (frontend-controlled)
  assigner_id: string | null;
  assignee_id: string | null;

  // core details
  title: string;
  description?: string;
  visibility: "public" | "private" | "shared";

  // recurrence (new)
  recurrence: Recurrence;

  // time window (legacy or session-specific)
  time_window: {
    start_at: number | null;
    due_at: number | null;
  };

  // rules
  conditions: Condition[];

  // camera target (ui only)
  cameraTarget: {
    latitude: number;
    longitude: number;
    zoom?: number;
    tilt?: number;
    bearing?: number;
  } | null;
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
};

/* -----------------------------
   Helpers
--------------------------------*/

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
  },

  time_window: {
    start_at: null,
    due_at: null,
  },

  conditions: [],
  cameraTarget: null,
});

// Logger middleware - pretty-print state in schema format
const logger = (config: any) => (set: any, get: any, api: any) =>
  config(
    (...args: any[]) => {
      const actionName = args[2] ?? "anonymous";
      
      // Execute the state update
      set(...args);
      
      // Get the new state
      const d = get().draft;
      
      console.log(`\n[Zustand] 🔄 ${actionName}`);
      console.log("─────────────────────────────────────────────────────────");
      console.log(`{
  assigner_id: ${JSON.stringify(d.assigner_id)},
  assignee_id: ${JSON.stringify(d.assignee_id)},
  title: ${JSON.stringify(d.title)},
  description: ${JSON.stringify(d.description)},
  visibility: ${JSON.stringify(d.visibility)},
  recurrence: ${JSON.stringify(d.recurrence, null, 4).split('\n').join('\n  ')},
  conditions: ${JSON.stringify(d.conditions, null, 4).split('\n').join('\n  ')}
}`);
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
               newRecurrence.ends = {
                 type: "after",
                 count: newRecurrence.days_of_week.length
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
    // location
    // -----------------
    setLocation: (updates: { latitude: number; longitude: number; radius: number; address: string; isInverse: boolean } | null) =>
      set(
        (state: TaskDraftStore) => {
          let updatedConditions = [...state.draft.conditions];
          
          if (updates) {
            const index = updatedConditions.findIndex((c: any) => c.metric_key === "location");
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
            updatedConditions = updatedConditions.filter((c: any) => c.metric_key !== "location");
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

          return {
            draft: { ...state.draft, ...newDraft, conditions },
          };
        },
        false,
        "draft/setDraft"
      ),
  }))
);
