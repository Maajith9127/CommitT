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

export type ConditionTargetType = "number" | "string" | "boolean" | "array" | "range";

export type Condition = {
  id: string; // frontend-only, for list rendering
  metric: string;
  relation: ConditionRelation;
  target: {
    type: ConditionTargetType;
    value: any;
  };
};

export type TaskDraft = {
  id: string;

  // assignment (frontend-controlled)
  assignee_id: string | null;

  // core details
  title: string;
  description?: string;
  visibility: "public" | "private" | "shared";

  // time window
  time_window: {
    start_at: number | null;
    due_at: number | null;
  };

  // rules
  conditions: Condition[];
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
  setAssignee: (userId: string | null) => void;

  setStartAt: (timestamp: number | null) => void;
  setDueAt: (timestamp: number | null) => void;

  // conditions
  addCondition: (condition: Omit<Condition, "id">) => void;
  updateCondition: (id: string, updates: Partial<Condition>) => void;
  removeCondition: (id: string) => void;
  clearConditions: () => void;

  // lifecycle
  resetDraft: () => void;
};

/* -----------------------------
   Helpers
--------------------------------*/

const createEmptyDraft = (): TaskDraft => ({
  id: nanoid(),

  assignee_id: null,

  title: "",
  description: "",
  visibility: "private",

  time_window: {
    start_at: null,
    due_at: null,
  },

  conditions: [],
});

/* -----------------------------
   Zustand Store
--------------------------------*/

export const useTaskDraftStore = create<TaskDraftStore>((set) => ({
  draft: createEmptyDraft(),

  // -----------------
  // basic setters
  // -----------------
  setTitle: (title) =>
    set((state) => ({
      draft: { ...state.draft, title },
    })),

  setDescription: (description) =>
    set((state) => ({
      draft: { ...state.draft, description },
    })),

  setVisibility: (visibility) =>
    set((state) => ({
      draft: { ...state.draft, visibility },
    })),

  setAssignee: (userId) =>
    set((state) => ({
      draft: { ...state.draft, assignee_id: userId },
    })),

  setStartAt: (timestamp) =>
    set((state) => ({
      draft: {
        ...state.draft,
        time_window: {
          ...state.draft.time_window,
          start_at: timestamp,
        },
      },
    })),

  setDueAt: (timestamp) =>
    set((state) => ({
      draft: {
        ...state.draft,
        time_window: {
          ...state.draft.time_window,
          due_at: timestamp,
        },
      },
    })),

  // -----------------
  // conditions
  // -----------------
  addCondition: (condition) =>
    set((state) => ({
      draft: {
        ...state.draft,
        conditions: [...state.draft.conditions, { ...condition, id: nanoid() }],
      },
    })),

  updateCondition: (id, updates) =>
    set((state) => ({
      draft: {
        ...state.draft,
        conditions: state.draft.conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      },
    })),

  removeCondition: (id) =>
    set((state) => ({
      draft: {
        ...state.draft,
        conditions: state.draft.conditions.filter((c) => c.id !== id),
      },
    })),

  clearConditions: () =>
    set((state) => ({
      draft: { ...state.draft, conditions: [] },
    })),

  // -----------------
  // lifecycle
  // -----------------
  resetDraft: () =>
    set(() => ({
      draft: createEmptyDraft(),
    })),
}));
