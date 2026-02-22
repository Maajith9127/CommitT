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
 * Schedules Screen
 * 
 * Main view for the calendar interface.
 * Orchestrates:
 * 1. Range State (for virtualizing infinite scroll)
 * 2. Data Fetching (Convex -> Calendar Events)
 * 3. Visual State (Skeleton Animation, Modal Selection)
 * 4. User Interactions (Navigation, Event Clicking)
 */
export default function SchedulesScreen() {
  const calendarRef = useRef<CalendarKitRef>(null);

  // 1. Range Management (Infinite Scroll Logic)
  const { range, handleVisibleDateChange } = useCalendarRange();

  // 2. Data Fetching (Reactive Convex Query)
  const { events } = useCalendarEvents(range.rangeStart, range.rangeEnd);

  // 3. Visual State
  const { showSkeleton, animatedOverlayStyle } = useSkeletonAnimation();

    
  // 4. Navigation Control (Sync with Global Store)
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  const setSelectedEvent = useCalendarStore((state) => state.setSelectedEvent);

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
    // Store the entire original data as requested
    const eventData = event.originalData || event;
    console.log("[Calendar] Event Pressed:", JSON.stringify(eventData, null, 2));
    setSelectedEvent(eventData);
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
