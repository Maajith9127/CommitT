import { Task } from "@/hooks/commits/useTasks";
import { Recurrence } from "@/stores/useTaskDraftStore";

// Mocking the Task structure. 
// Note: These IDs are fake and won't work for backend operations like delete/update unless handled specially.
export const DEFAULT_TASKS: Task[] = [
  {
    _id: "default_1" as any,
    _creationTime: Date.now(),
    assigner_id: "default",
    assignee_id: "default",
    title: "Ex1 (Gym)",
    description: "Do the Habit",
    visibility: "private",
    recurrence: {
      type: "weekly",
      interval: 1,
      time_windows: [{ start: 21600, end: 28800 }], // 6am - 8am
      days_of_week: [1, 3, 5], // Mon, Wed, Fri
      ends: { type: "never" },
    } as Recurrence,
    conditions: [
      {
        metric_key: "location",
        relation: "within",
        target: {
          type: "number",
          value: {
            lat: 12.973472807705534,
            lng: 79.1647620499134,
            radius: 50,
            address: "Fitty Gym VIT, Katpadi, Vellore, Tamil Nadu, India",
          },
        },
      } as any,
    ],
    status: "active",
  },
  {
    _id: "default_2" as any,
    _creationTime: Date.now() - 1000,
    assigner_id: "default",
    assignee_id: "default",
    title: "Ex2 (Library)",
    description: "Study session",
    visibility: "private",
    recurrence: {
      type: "weekly",
      interval: 1,
      time_windows: [{ start: 72000, end: 86100 }], // 8pm - 11:55pm
      days_of_week: [6, 0], // Sat, Sun
      ends: { type: "never" },
    } as Recurrence,
    conditions: [
      {
        metric_key: "location",
        relation: "within",
        target: {
          type: "number",
          value: {
            lat: 12.9692, 
            lng: 79.1559, // Slightly different location for realism
            radius: 50,
            address: "Central Library, VIT University",
          },
        },
      } as any,
    ],
    status: "active",
  },
  {
    _id: "default_3" as any,
    _creationTime: Date.now() - 2000,
    assigner_id: "default",
    assignee_id: "default",
    title: "Deep Work",
    description: "Focus blocks",
    visibility: "private",
    recurrence: {
      type: "daily",
      interval: 1,
      time_windows: [{ start: 32400, end: 43200 }], // 9am - 12pm
      ends: { type: "never" },
    } as Recurrence,
    conditions: [],
    status: "active",
  },
  {
    _id: "default_4" as any,
    _creationTime: Date.now() - 3000,
    assigner_id: "default",
    assignee_id: "default",
    title: "Meditation",
    description: "Morning mindfulness",
    visibility: "public",
    recurrence: {
      type: "daily",
      interval: 1,
      time_windows: [{ start: 25200, end: 27000 }], // 7am - 7:30am
      ends: { type: "never" },
    } as Recurrence,
    conditions: [],
    status: "active",
  },
  {
    _id: "default_5" as any,
    _creationTime: Date.now() - 4000,
    assigner_id: "default",
    assignee_id: "default",
    title: "Project Sync",
    description: "Weekly team alignment",
    visibility: "private",
    recurrence: {
      type: "weekly",
      interval: 1,
      time_windows: [{ start: 36000, end: 39600 }], // 10am - 11am
      days_of_week: [1], // Monday
      ends: { type: "never" },
    } as Recurrence,
    conditions: [],
    status: "active",
  },
];
