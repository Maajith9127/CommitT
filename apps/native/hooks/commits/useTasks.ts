import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@commit/backend/convex/_generated/api';
import type { Doc } from '@commit/backend/convex/_generated/dataModel';
import { authClient } from '@/lib/auth-client';

export type Task = Doc<'tasks'>;

/**
 * useTasks
 * 
 * Fetches all tasks assigned to the current user.
 * Returns sorted tasks (most recent first) and loading state.
 */
export function useTasks() {
  const { data: session } = authClient.useSession();
  
  // Fetch tasks
  const tasks = useQuery(
    api.api.commitments.read.byAssignee, 
    session?.user?.id ? { assignee_id: session.user.id } : "skip"
  );

  const isLoading = tasks === undefined;
  const hasTasks = Boolean(tasks && tasks.length > 0);

  // Sort by most recently updated/created
  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    return [...tasks].sort((a, b) => {
      const aTime = a.updated_at ?? a.created_at ?? 0;
      const bTime = b.updated_at ?? b.created_at ?? 0;
      return bTime - aTime; // Descending
    });
  }, [tasks]);

  return {
    tasks: sortedTasks,
    isLoading,
    hasTasks,
    session, // Expose session for other hooks if needed
  };
}
