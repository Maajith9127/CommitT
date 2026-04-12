import { useMemo, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@commit/backend/convex/_generated/api';
import { TASK_COLORS } from '../../components/calendar/CalendarConfig';
import { useCalendarStore, CalendarEvent } from '@/stores/useCalendarStore';
import { authClient } from '@/lib/auth-client';

export function useCalendarEvents() {
  const rangeStart = useCalendarStore((state) => state.rangeStart);
  const rangeEnd = useCalendarStore((state) => state.rangeEnd);
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

      // 3. Determine the effective status for visual representation
      const style = inst.config?.verification_style;
      let effectiveStatus = inst.status;

      if (style === "just_show_up" && Array.isArray(inst.checkpoints) && inst.checkpoints.length > 0) {
        const cp = inst.checkpoints[0];
        const statuses = cp.verification_status || {};
        const allVerified = Object.keys(statuses).every(key => (statuses as any)[key] === "verified");
        if (allVerified) effectiveStatus = "proceeded";
      }

      // Determine the calendar block color based on effective status
      let eventColor = taskColorMap.get(inst.task_id) || TASK_COLORS[0];
      if (effectiveStatus === "proceeded" || effectiveStatus === "waived") {
        eventColor = "#4CD964"; // success green
      } else if (effectiveStatus === "failed" || effectiveStatus === "penalized") {
        eventColor = "#FF3B30"; // danger red
      } else if (effectiveStatus === "waiver_active") {
        eventColor = "#FF9F0A"; // warning orange
      }

      return {
        id: inst._id,
        title: inst.title,
        start: { dateTime: new Date(inst.start).toISOString() },
        end: { dateTime: new Date(inst.end).toISOString() },
        color: eventColor,
        originalData: inst,
      };
    });

    prevEventsRef.current = mappedEvents;
    return mappedEvents;

  }, [instances]);

  // Events are returned locally — NOT pushed to Zustand.
  // This keeps the CalendarStore clean and prevents cascade re-renders
  // in other components (like EventDetailModal) that used to subscribe to events[].
  return { events, isLoading: !instances };
}
