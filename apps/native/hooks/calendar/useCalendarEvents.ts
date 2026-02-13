import { useMemo, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@commit/backend/convex/_generated/api';
import { TASK_COLORS } from '../../components/calendar/CalendarConfig';

export interface CalendarEvent {
  id: string;
  title: string;
  start: { dateTime: string };
  end: { dateTime: string };
  color: string;
  originalData: any;
}

/**
 * useCalendarEvents
 * 
 * Fetches task instances from Convex based on the provided time range.
 * Transforms raw DB records into CalendarKit-compatible event objects.
 * Handles stable color assignment for tasks.
 */
export function useCalendarEvents(rangeStart: number, rangeEnd: number) {
  // Convex Query
  const instances = useQuery(api.api.instances.read.byRange, {
    rangeStart,
    rangeEnd,
  });

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

  return { events, isLoading: !instances };
}
