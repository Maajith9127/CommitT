
import { MutationCtx } from "../../_generated/server";
import { Id, Doc } from "../../_generated/dataModel";

export type InstanceCreateArgs = {
  task_id: Id<"tasks">;
  assignee_id: string;
  start: number;
  end: number;
  title: string;
  description: string;
  recurrence: any;
  conditions: any[];
  config: Doc<"tasks">["config"];
  next_instance_id?: Id<"taskInstances">;
  status?: "pending" | "proceeding" | "proceeded" | "failed";
};

/**
 * Core business logic for creating a single task instance.
 * 
 * This is a shared utility used by:
 * 1. `createAllInstances` (bulk generation)
 * 2. Manual instance creation (one-off exceptions)
 * 
 * It handles the raw DB insertion.
 */
export async function createInstanceInternal(
  ctx: MutationCtx, 
  args: InstanceCreateArgs
): Promise<Id<"taskInstances">> {
  const instanceId = await ctx.db.insert("taskInstances", {
    task_id: args.task_id,
    assignee_id: args.assignee_id,
    status: args.status ?? "pending",
    start: args.start,
    end: args.end,
    title: args.title,
    description: args.description,
    recurrence: args.recurrence,
    conditions: args.conditions,
    config: args.config,
    next_instance_id: args.next_instance_id,
  });

  return instanceId;
}
