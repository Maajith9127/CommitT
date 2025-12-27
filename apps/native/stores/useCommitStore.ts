import { create } from "zustand";

export type Commit = {
  id: string;
  title: string;
  conditions: number;
  iconName: string;
  statusLabel: "Active" | "Paused" | "Completed";
};

type CommitStore = {
  commits: Commit[];
  setCommits: (commits: Commit[]) => void;
};

export const useCommitStore = create<CommitStore>((set) => ({
  commits: [
    { id: "1", title: "Focus", conditions: 2, iconName: "target", statusLabel: "Active" },
    { id: "2", title: "Gym", conditions: 1, iconName: "dumbbell", statusLabel: "Active" },
    {
      id: "3",
      title: "Study",
      conditions: 3,
      iconName: "book-open-page-variant",
      statusLabel: "Active",
    },
    { id: "4", title: "Meditation", conditions: 1, iconName: "meditation", statusLabel: "Paused" },
    { id: "5", title: "No Sugar", conditions: 2, iconName: "food-off", statusLabel: "Active" },
    { id: "6", title: "Sleep Early", conditions: 1, iconName: "sleep", statusLabel: "Completed" },
    { id: "7", title: "Reading", conditions: 2, iconName: "book", statusLabel: "Active" },
    { id: "8", title: "Running", conditions: 1, iconName: "run", statusLabel: "Paused" },
    { id: "9", title: "Code Daily", conditions: 3, iconName: "laptop", statusLabel: "Active" },
    {
      id: "10",
      title: "No Phone Night",
      conditions: 1,
      iconName: "cellphone-off",
      statusLabel: "Completed",
    },
  ],

  setCommits: (commits) => set({ commits }),
}));
