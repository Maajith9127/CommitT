import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@commit/backend/convex/_generated/api';
import { useVerificationStore } from '@/stores/useVerificationStore';
import { authClient } from '@/lib/auth-client';
import dayjs from 'dayjs';

/**
 * useUpcomingVerification
 * 
 * Pipeline Headless Synchronizer:
 * Fetches instances 24h into the past and 7 days into the future.
 * Locally calculates the VERY NEXT instance that has NOT YET EXPIRED (end >= now).
 * Keeps checking every 1 minute so the UI drops missed events automatically!
 */
export function useUpcomingVerification() {
  const setUpcomingEvent = useVerificationStore((state) => state.setUpcomingEvent);
  const { data: session } = authClient.useSession();

  // Stable query frame keeps Convex websocket cheap and cached
  const range = useMemo(() => {
    return {
      // Look back a hit just in case they just missed it, or just started recently today
      start: dayjs().subtract(1, 'day').startOf('day').valueOf(),
      end: dayjs().add(7, 'day').endOf('day').valueOf(),
    };
  }, []);

  const instances = useQuery(
    api.api.instances.read.byRange, 
    session?.user?.id ? {
      rangeStart: range.start,
      rangeEnd: range.end,
    } : "skip"
  );

  // Keep a ref of live data for the interval tick
  const instancesRef = useRef<any>(null);
  instancesRef.current = instances;

  useEffect(() => {
    const calculateNext = () => {
      const data = instancesRef.current;
      if (!data) return;

      const now = Date.now();
      
      const nextPending = data
        .filter((inst: any) => {
          // If already verified or failed, skip it
          if (inst.status === 'verified' || inst.status === 'failed') return false;
          
          // CRITICAL: Only include instances where the deadline (end) has NOT passed yet!
          // (This matches the hand-drawn logic precisely)
          return inst.end >= now;
        })
        // Sort by start to get the earliest available instance
        .sort((a: any, b: any) => a.start - b.start)[0] || null;

      // Update global store
      setUpcomingEvent(nextPending);
    };

    calculateNext(); // Run immediately when data syncs
    
    // Heartbeat check every 30 seconds to automatically drop expired events in real-time
    const intervalId = setInterval(calculateNext, 30000); 

    return () => clearInterval(intervalId);
  }, [instances, setUpcomingEvent]);

  return null; // Headless
}
