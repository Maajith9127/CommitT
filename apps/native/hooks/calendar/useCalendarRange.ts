import { useState, useRef, useCallback } from 'react';
import { CalendarKitRef } from '@howljs/calendar-kit';
import { REF_FETCH_BUFFER_MS } from '../../components/calendar/CalendarConfig';

/**
 * Helper: Compute a ±2 month range centered on a given timestamp.
 */
function computeRange(centerMs: number) {
  const start = new Date(centerMs);
  start.setMonth(start.getMonth() - 2);
  const end = new Date(centerMs);
  end.setDate(end.getDate() + 6); // Add a week buffer to the end? Original logic kept here.
  end.setMonth(end.getMonth() + 2);
  return { rangeStart: start.getTime(), rangeEnd: end.getTime() };
}

/**
 * useCalendarRange
 * 
 * Manages the "Active Range" for fetching data. 
 * Implements debouncing to prevent excessive refetches during rapid scrolling.
 */
export function useCalendarRange() {
  // Initial state: Today ± 2 months
  const [range, setRange] = useState(() => computeRange(Date.now()));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Called by CalendarKit's `onChange` callback.
   * Checks if the visible date is close to the edge of our loaded range.
   * If so, recenters the range and triggers a refetch (via state update).
   */
  const handleVisibleDateChange = useCallback((calendarRef: React.RefObject<CalendarKitRef>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const visibleStart = calendarRef.current?.getVisibleStart();
      if (!visibleStart) return;
      
      const visibleMs = new Date(visibleStart).getTime();

      // Check if we're within the buffer zone of either edge
      const nearStart = visibleMs < range.rangeStart + REF_FETCH_BUFFER_MS;
      const nearEnd = visibleMs > range.rangeEnd - REF_FETCH_BUFFER_MS;

      if (nearStart || nearEnd) {
        const newRange = computeRange(visibleMs);
        setRange(newRange);
        console.log(`[useCalendarRange] Updating range: ${new Date(newRange.rangeStart).toISOString()} -> ${new Date(newRange.rangeEnd).toISOString()}`);
      }
    }, 1000); // 1-second debounce
  }, [range]);

  return {
    range,
    handleVisibleDateChange,
  };
}
