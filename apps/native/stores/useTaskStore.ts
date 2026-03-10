import { create } from "zustand";
import type { Doc } from "@commit/backend/convex/_generated/dataModel";

export type Task = Doc<"tasks">;

interface TaskState {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  getTaskById: (id: string) => Task | undefined;
}

export const useTaskStore = create<TaskState>((set: any) => ({
  tasks: [],
  setTasks: (tasks: Task[]) => set({ tasks }),
  getTaskById: (id: string) => {
    return useTaskStore.getState().tasks.find((t: Task) => t._id === id);
  },
}));
