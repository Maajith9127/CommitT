import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// The "Watchdog" runs every hour to ensure no task is left without a scheduled job.
// This handles any potential race conditions or manual DB edits that might have 
// bypassed the standard mutation logic.
crons.interval(
  "Self-healing task scheduler sync",
  { hours: 1 },
  internal.execution.watchdog.watchdogSync
);

export default crons;
