import React, { useRef, useEffect, useCallback, useState } from 'react';
import dayjs from 'dayjs';
import Animated from 'react-native-reanimated';
import { View, Text, Alert } from 'react-native';
import { useMutation } from 'convex/react';
import { useSQLiteContext } from 'expo-sqlite';
import { api } from '@commit/backend/convex/_generated/api';
import { scheduleNextAlarm } from '@/modules/scheduler-module';
import { updateSingleInstanceInLocalDb } from '@/lib/local-db-instances';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CalendarKit, { 
  CalendarBody, 
  CalendarHeader,
  CalendarKitRef,
  DraggingEvent,
  DraggingEventProps
} from '@howljs/calendar-kit';
import { withUniwind } from 'uniwind';
import { useCalendarStore } from '@/stores/useCalendarStore';
import { CalendarShimmer } from '@/components/ui/skeletons/CalendarShimmer';
import { ConfirmationModal } from '@/components/ui/modal/ConfirmationModal';
import { HeaderTitle, FooterText } from "@/components/ui/text";

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
  const db = useSQLiteContext();
  const updateInstance = useMutation(api.api.instances.update.update);

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

  // 5. Drag-and-Drop Confirmation State
  const [dragConfirm, setDragConfirm] = useState<{
    visible: boolean;
    event?: any;
    newStart?: string;
    newEnd?: string;
    isOverlapError?: boolean;
    overlapMessage?: string;
  }>({ visible: false });

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

  /**
   * handleDragEventEnd
   * 
   * Triggered when a user finishes dragging an event to a new time slot.
   * This provides detailed logs of the transition for verification.
   */
  /**
   * handleDragEventEnd
   * 
   * Orchestrates the event update lifecycle following a user-initiated drag-and-drop 
   * operation. This callback captures the transition and triggers the confirmation UI.
   * 
   * @param updatedEvent - The event object containing the mutated start/end timestamps.
   */
  const handleDragEventEnd = useCallback((updatedEvent: any) => {
    setDragConfirm({
        visible: true,
        event: updatedEvent,
        newStart: updatedEvent.start.dateTime || updatedEvent.start.date,
        newEnd: updatedEvent.end.dateTime || updatedEvent.end.date,
    });
    
    console.log("[SCHEDULER_EVENT] INTERCEPTED_FOR_CONFIRMATION:", updatedEvent.title);
  }, []);

  /**
   * executeEventUpdate
   * 
   * Effectively persists the temporal mutation to the backend after user validation.
   */
  const executeEventUpdate = useCallback(async () => {
    if (!dragConfirm.event || !dragConfirm.newStart || !dragConfirm.newEnd) return;
    
    const instanceId = dragConfirm.event.id;
    console.log("[SCHEDULER_EVENT] COMMITTING_TRANSITION_TO_BACKEND:", instanceId);

    try {
        const result = await updateInstance({
            id: instanceId,
            start: new Date(dragConfirm.newStart).getTime(),
            end: new Date(dragConfirm.newEnd).getTime(),
        });

        if (result.success && result.instance) {
            console.log("[SCHEDULER_EVENT] BACKEND_PERSISTENCE_SUCCESS. Proceeding to Local Sync.");

            // 1. Sync the authoritative state to the local SQLite cache
            await updateSingleInstanceInLocalDb(db, result.instance as any);
            console.log("[SCHEDULER_EVENT] LOCAL_CACHE_SYNC_SUCCESS.");

            // 2. Trigger hardware alarm synchronization
            try {
              scheduleNextAlarm();
              console.log("[SCHEDULER_EVENT] NATIVE_HARDWARE_ALARM_SYNC_SUCCESS.");
            } catch (alarmError) {
              console.error("[SCHEDULER_EVENT] NATIVE_ALARM_SYNC_FAILED:", alarmError);
            }

            setDragConfirm({ visible: false });
        } else if (result.error === "OVERLAP_DETECTED") {
            // Re-trigger modal with acknowledgment state
            setDragConfirm(prev => ({ 
                ...prev, 
                visible: true, 
                isOverlapError: true,
                overlapMessage: result.message
            }));
            console.warn("[SCHEDULER_EVENT] BACKEND_PERSISTENCE_BLOCKED: Overlap detected");
        }
    } catch (error: any) {
        console.error("[SCHEDULER_EVENT] BACKEND_PERSISTENCE_FAILURE:", error);
        Alert.alert("Sync Error", "Failed to reach the server. Please check your connection.");
        setDragConfirm({ visible: false });
    }
  }, [dragConfirm, updateInstance]);

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
            allowDragToEdit={true}
            dragStep={15}
            onDragEventEnd={handleDragEventEnd}
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

          {/* Drag and Drop Confirmation Modal */}
          <ConfirmationModal
            visible={dragConfirm.visible}
            title={
                dragConfirm.isOverlapError 
                    ? (dragConfirm.overlapMessage || "Schedule Conflict")
                    : (dragConfirm.event && dragConfirm.newStart 
                        ? `Move "${dragConfirm.event.title}" to ${dayjs(dragConfirm.newStart).format('h:mm A')} - ${dayjs(dragConfirm.newEnd).format('h:mm A')} on ${dayjs(dragConfirm.newStart).format('DD MMM')}?`
                        : "Reschedule Commitment?")
            }
            onConfirm={dragConfirm.isOverlapError ? () => setDragConfirm({ visible: false }) : executeEventUpdate}
            onCancel={() => setDragConfirm({ visible: false })}
            confirmText={dragConfirm.isOverlapError ? "OK" : "Update"}
            confirmColor="#4FA0FF"
            cancelColor="#FF3B30"
            singleButton={dragConfirm.isOverlapError}
          />

      </UView>
    </GestureHandlerRootView>
  );
}
