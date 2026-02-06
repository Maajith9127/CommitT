export const TASK_TIMEOUT = 3600000; // 1 hour
export const MAX_TASKS_PER_USER = 100;
export const VERIFICATION_WINDOW = 300000; // 5 minutes
export const SCHEDULER_CHECK_INTERVAL = 60000; // 1 minute

export const TABLES = {
  TASKS: "tasks",
  USERS: "users",
  TASK_INSTANCES: "taskInstances",
} as const;
