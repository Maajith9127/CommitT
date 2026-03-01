import React, { useRef, useEffect, useCallback } from 'react';
import Animated from 'react-native-reanimated';
import { View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CalendarKit, { 
  CalendarBody, 
  CalendarHeader,
  CalendarKitRef,
} from '@howljs/calendar-kit';
import { withUniwind } from 'uniwind';
import { useCalendarStore } from '@/stores/useCalendarStore';
import { CalendarShimmer } from '@/components/ui/skeletons/CalendarShimmer';

// Extracted Configuration & Hooks
import { INITIAL_LOCALES, CUSTOM_THEME } from '@/components/calendar/CalendarConfig';
import { useCalendarRange } from '@/hooks/calendar/useCalendarRange';
import { useCalendarEvents } from '@/hooks/calendar/useCalendarEvents';
import { useSkeletonAnimation } from '@/hooks/calendar/useSkeletonAnimation';

// Uniwind components for styling
const UView = withUniwind(View);
const UText = withUniwind(Text);

/**
 * Schedules Screen (`/app/(main)/schedules.tsx`)
 * 
 * The main calendar view rendering the user's commitments and schedules. 
 * Built on top of the extremely fast `@howljs/calendar-kit` which utilizes Reanimated 
 * and GestureHandler for pure native 60fps performance.
 * 
 * ARCHITECTURE OVERVIEW:
 * 1. Range Management (`useCalendarRange`):
 *    The calendar lazily loads bounds. As the user swipes forward/backward, the hook 
 *    calculates the new viewport and updates the state.
 * 
 * 2. Data Fetching (`useCalendarEvents`):
 *    Subscribes to the local database / remote backend using the computed date payload 
 *    from `useCalendarRange`. Real-time push updates.
 * 
 * 3. Modal Architecture (CRITICAL):
 *    When a calendar event is clicked, we DO NOT mount a local modal layer here. 
 *    Doing so would force the massive `+@howljs/calendar-kit` to execute a heavy React 
 *    re-render cycle, stuttering the app. Instead, we use Zustand (`setSelectedEvent`) 
 *    to pop the Singleton `<EventDetailModal>` located at the root `_layout.tsx`, 
 *    achieving sub-millisecond tap-to-render times.
 */
export default function SchedulesScreen() {
  const calendarRef = useRef<CalendarKitRef>(null);

  // 1. Range Management (Infinite Scroll Logic)
  const { range, handleVisibleDateChange } = useCalendarRange();

  // 2. Data Fetching (LOCAL — events stay in this component, not pushed to Zustand)
  const { events, isLoading } = useCalendarEvents();

  // Sync the local range from the calendar kit back to the global store
  // so the headless background fetcher knows what to download!
  const setRange = useCalendarStore((state) => state.setRange);
  useEffect(() => {
    setRange(range.rangeStart, range.rangeEnd);
  }, [range.rangeStart, range.rangeEnd]);

  // 3. Visual State
  const { showSkeleton, animatedOverlayStyle } = useSkeletonAnimation();

    
  // 4. Navigation Control (Sync with Global Store)
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  const setSelectedEventId = useCalendarStore((state) => state.setSelectedEventId);

  useEffect(() => {
    if (calendarRef.current && selectedDate) {
      calendarRef.current.goToDate({ date: selectedDate, animatedDate: true });
    }
  }, [selectedDate]);

  // -- Render Helpers --

  const renderEvent = useCallback((event: any) => {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <UText className="text-white font-bold text-center text-[10px]">
          {event.title}
        </UText>
      </View>
    );
  }, []);

  const handleEventPress = useCallback((event: any) => {
    // Push the full event data into Zustand's single-event slot
    const eventData = event.originalData || event;
    console.log("[Calendar] Event Pressed (ID):", eventData._id);
    setSelectedEventId(eventData._id, eventData);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UView className="flex-1 bg-black relative">
          {/* Fixed Time Axis Header */}
          <UView className="absolute top-5 left-0 w-[20%] items-center z-10">
               <UText className="text-white font-bold">Time</UText>
          </UView>

          <CalendarKit
            ref={calendarRef}
            numberOfDays={4}
            locale="en"
            initialLocales={INITIAL_LOCALES}
            hourFormat="h A"
            theme={CUSTOM_THEME}
            minTimeIntervalHeight={80}
            initialTimeIntervalHeight={80}
            events={events}
            useHaptic={true}
            allowPinchToZoom={true}
            onPressEvent={handleEventPress}
            onChange={(event) => handleVisibleDateChange(calendarRef)}
          >
            <CalendarHeader />
            <CalendarBody 
                renderEvent={renderEvent}
            />
          </CalendarKit>

          {/* Loading Skeleton Overlay */}
          {showSkeleton && (
            <Animated.View 
              style={[
                { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 50 }, 
                animatedOverlayStyle
              ]}
              pointerEvents="none"
            >
              <CalendarShimmer />
            </Animated.View>
          )}

      </UView>
    </GestureHandlerRootView>
  );
}
