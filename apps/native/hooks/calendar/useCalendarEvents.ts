import { useMemo, useRef, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@commit/backend/convex/_generated/api';
import { TASK_COLORS } from '../../components/calendar/CalendarConfig';
import { useCalendarStore, CalendarEvent } from '@/stores/useCalendarStore';
import { authClient } from '@/lib/auth-client';

export function useCalendarEvents() {
  const { rangeStart, rangeEnd, setEvents } = useCalendarStore();
  const { data: session } = authClient.useSession();

  // Convex Query - Guards against unauthenticated calls using "skip"
  const instances = useQuery(
    api.api.instances.read.byRange, 
    session?.user?.id ? { rangeStart, rangeEnd } : "skip"
  );

  // Cache previous events to prevent flickering during loading states
  const prevEventsRef = useRef<CalendarEvent[]>([]);

  const events = useMemo(() => {
    if (!instances) return prevEventsRef.current;

    console.log(`[useCalendarEvents] Fetched ${instances.length} instances.`);

    const taskColorMap = new Map<string, string>();
    let colorIndex = 0;

    const mappedEvents: CalendarEvent[] = instances.map((inst: any) => {
      // Assign specific color per task_id
      if (!taskColorMap.has(inst.task_id)) {
        taskColorMap.set(inst.task_id, TASK_COLORS[colorIndex % TASK_COLORS.length]);
        colorIndex++;
      }

      return {
        id: inst._id,
        title: inst.title,
        start: { dateTime: new Date(inst.start).toISOString() },
        end: { dateTime: new Date(inst.end).toISOString() },
        color: taskColorMap.get(inst.task_id) || TASK_COLORS[0],
        originalData: inst,
      };
    });

    prevEventsRef.current = mappedEvents;
    return mappedEvents;

  }, [instances]);

  // Sycn with Zustand Store!! 🪄
  useEffect(() => {
    if (events && events.length > 0) {
      setEvents(events);
    }
  }, [events]);

  return { events, isLoading: !instances };
}
