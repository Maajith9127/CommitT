import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@commit/backend/convex/_generated/api';
import { useVerificationStore } from '@/stores/useVerificationStore';
import { authClient } from '@/lib/auth-client';

/**
 * useUpcomingVerification
 * 
 * SERVER-AUTHORITATIVE SYNCHRONIZER:
 * This hook subscribes to the dedicated 'next' query on the backend.
 * 
 * WHY THIS IS BETTER:
 * 1. Zero-Horizon: Works even if your next task is 2 weeks away (previously capped at 7 days).
 * 2. Mobile Efficiency: No local filtering, no intervals, and no 30s heartbeats. 
 *    Convex pushes a new update ONLY when the next task changes or the current one expires.
 * 3. Clean Architecture: The phone just displays a pointer; the server handles the schedule.
 */
export function useUpcomingVerification() {
  const setUpcomingEvent = useVerificationStore((state) => state.setUpcomingEvent);
  const { data: session } = authClient.useSession();

  // Subscribe directly to the 'Next' pointer.
  // Convex automatically re-runs this query when time passes or data changes.
  const nextInstance = useQuery(
    api.api.instances.read.next, 
    session?.user?.id ? {} : "skip"
  );

  useEffect(() => {
    // If we have a result (including null which means 'no upcoming tasks'), 
    // update the global store immediately.
    if (nextInstance !== undefined) {
      setUpcomingEvent(nextInstance);
    }
  }, [nextInstance, setUpcomingEvent]);

  return null; // Headless Hook
}
