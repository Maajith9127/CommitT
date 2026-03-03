import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import dayjs from 'dayjs';
import { useMutation } from 'convex/react';
import { useSQLiteContext } from 'expo-sqlite';
import { api } from '@commit/backend/convex/_generated/api';
import { scheduleNextAlarm } from '@/modules/scheduler-module';
import { updateSingleInstanceInLocalDb } from '@/lib/local-db-instances';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CalendarKit, { 
  CalendarBody, 
  CalendarHeader,
  CalendarKitRef
} from '@howljs/calendar-kit';
import { withUniwind } from 'uniwind';
import { useCalendarStore } from '@/stores/useCalendarStore';
import { CalendarShimmer } from '@/components/ui/skeletons/CalendarShimmer';
import { ConfirmationModal } from '@/components/ui/modal/ConfirmationModal';
import Animated from 'react-native-reanimated';

// Import domain-specific hooks and configuration
import { INITIAL_LOCALES, CUSTOM_THEME } from '@/components/calendar/CalendarConfig';
import { useCalendarRange } from '@/hooks/calendar/useCalendarRange';
import { useCalendarEvents } from '@/hooks/calendar/useCalendarEvents';
import { useSkeletonAnimation } from '@/hooks/calendar/useSkeletonAnimation';

// Styled primitive components optimized for consistent spacing and typography
const UView = withUniwind(View);
const UText = withUniwind(Text);

/**
 * Schedules Screen (`/app/(main)/schedules.tsx`)
 * 
 * OVERVIEW:
 * This component provides a high-performance, interactive calendar view for long-term 
 * commitment planning. It leverages native-driven animations and a strictly optimized 
 * synchronization engine to handle complex time-based tasks.
 * 
 * ARCHITECTURAL DESIGN PATTERNS:
 * 
 * 1. PERSISTENT SELECTION MODAL:
 *    To prevent accidental mutations, we use a two-step UX. Users must 'Long Press' an 
 *    event to activate edit handles. Only when handles are visible can an event be 
 *    dragged or resized. A single tap always routes to the singleton detail view.
 * 
 * 2. TRIPLE-WRITE PROTOCOL (AUTHORITATIVE SYNC):
 *    Consistency is the highest priority. When a temporal shift is confirmed:
 *    A. CLOUD WRITE: Update the Convex state (Authoritative source).
 *    B. LOCAL CACHE: Sync the result to SQLite (Ensures offline UI validity).
 *    C. HARDWARE SYNC: Signal the Native Alarm module to reschedule system triggers.
 * 
 * 3. HEADLESS RANGE MANAGEMENT:
 *    As the user navigates through time (swiping days/weeks), the `useCalendarRange` 
 *    hook computes the visible window. This range is mirrored to the `useCalendarStore`, 
 *    which triggers background fetchers to hydrate the local cache with relevant data.
 */
export default function SchedulesScreen() {
  // --- REFERENCES & CONTEXT ---
  
  // Direct handle to the Calendar controller for imperative actions like 'Go to Date'
  const calendarRef = useRef<CalendarKitRef>(null);

  // SQLite Database instance for local cache synchronization
  const db = useSQLiteContext();

  // Convex mutation for persisting remote updates
  const updateInstance = useMutation(api.api.instances.update.update);

  // --- 1. LOCAL INTERACTION STATE ---

  /**
   * selectedCalendarEvent:
   * Holds the event object that is currently in 'Edit Mode'.
   * When defined, the Calendar component renders interactive resize and drag handles.
   */
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<any>(undefined);

  /**
   * dragConfirm:
   * Staging state for a proposed change. Triggered after a drag/resize finishes but 
   * before the 'Triple-Write' protocol is executed.
   */
  const [dragConfirm, setDragConfirm] = useState<{
    visible: boolean;
    event?: any;
    newStart?: string;
    newEnd?: string;
    isOverlapError?: boolean;
    overlapMessage?: string;
  }>({ visible: false });

  // Range management: Computes current view bounds for lazy data loading
  const { range, handleVisibleDateChange } = useCalendarRange();

  // Primary event data source: Listens to Convex subscription via an optimized hook
  const { events, isLoading } = useCalendarEvents();

  // --- 2. GLOBAL SYNCHRONIZATION EFFECTS ---

  /**
   * Sync range to Global Store:
   * Notifies the rest of the application (and background sync processes) about 
   * exactly which time-slices are currently visible to the user.
   */
  const setRange = useCalendarStore((state) => state.setRange);
  useEffect(() => {
    setRange(range.rangeStart, range.rangeEnd);
  }, [range.rangeStart, range.rangeEnd]);

  // Loading Micro-Interaction: Controls skeleton visibility and fade animations
  const { showSkeleton, animatedOverlayStyle } = useSkeletonAnimation();

  /**
   * Deep Navigation Listener:
   * Allows the UI to snap to a specific date (e.g., when clicking a 'Today' button
   * or following a push notification link).
   */
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  const setSelectedEventId = useCalendarStore((state) => state.setSelectedEventId);

  useEffect(() => {
    if (calendarRef.current && selectedDate) {
      calendarRef.current.goToDate({ date: selectedDate, animatedDate: true });
    }
  }, [selectedDate]);

  // --- 3. COMPONENT RENDERING & USER INTERACTION ---

  /**
   * renderEvent:
   * Pure functional child renderer for event blocks. 
   * Optimized for 60fps performance during fast scrolling.
   */
  const renderEvent = useCallback((event: any) => {
    return (
      <UView className="flex-1 justify-center items-center px-1">
        <UText className="text-white font-bold text-center text-[10px]" numberOfLines={2}>
          {event.title}
        </UText>
      </UView>
    );
  }, []);

  /**
   * handleEventPress (Single Tap):
   * Sets the global 'Selected Event ID' which signals the root _layout to mount 
   * the singleton EventDetailModal. This avoids heavy re-renders of the large calendar.
   */
  const handleEventPress = useCallback((event: any) => {
    const eventData = event.originalData || event;
    console.log("[Calendar] Interaction: Routing to Detail for", eventData._id);
    setSelectedEventId(eventData._id, eventData);
  }, [setSelectedEventId]);

  /**
   * handleEventLongPress:
   * Enters 'Edit Mode'. This is a friction-based gesture to prevent accidental events moves.
   */
  const handleEventLongPress = useCallback((event: any) => {
    console.log("[Calendar] Interaction: Entering Edit Mode for", event.title);
    setSelectedCalendarEvent(event);
  }, []);

  /**
   * handleDragSelectedEventEnd:
   * Fires when the user finishes a drag-and-drop or resize operation.
   * Normalizes timestamps from the library's internal payload format.
   */
  const handleDragSelectedEventEnd = useCallback((...args: any[]) => {
    let [event, newStart, newEnd] = args;

    // Library API Normalization:
    // Some versions of the library provide a single 'updatedEvent' object instead of 
    // separate start/end strings. We guard against this variation here.
    if (!newStart && event) {
      newStart = event.start?.dateTime || event.start?.date;
      newEnd = event.end?.dateTime || event.end?.date;
    }

    setDragConfirm({
        visible: true,
        event: event,
        newStart: newStart,
        newEnd: newEnd,
    });
  }, []);

  // --- 4. PERSISTENCE WORKFLOW (THE "TRIPLE-WRITE") ---

  /**
   * executeEventUpdate:
   * The core of the application's data integrity engine.
   * Ensures that a single user action (Update) propagates to all architectural layers.
   */
  const executeEventUpdate = useCallback(async () => {
    if (!dragConfirm.event || !dragConfirm.newStart || !dragConfirm.newEnd) return;
    
    // Resolve ID: Handle mismatch between raw '_id' (Convex) and library-provided 'id'.
    const instanceId = dragConfirm.event._id || dragConfirm.event.id;
    console.log("[SYNC_FLOW] Stage 1: Initializing Cloud Mutation for", instanceId);

    try {
        // Step 1: PERSIST TO CLOUD (Authoritative source)
        const result = await updateInstance({
            id: instanceId,
            start: new Date(dragConfirm.newStart).getTime(),
            end: new Date(dragConfirm.newEnd).getTime(),
        });

        if (result.success && result.instance) {
            console.log("[SYNC_FLOW] Stage 2: Cloud success. Commencing Local Persistence.");

            // Step 2: SYNC TO LOCAL SQLITE CACHE (For offline UI consistency)
            await updateSingleInstanceInLocalDb(db, result.instance as any);

            // Step 3: SIGNAL HARDWARE ALARMS (Native Android/iOS background logic)
            try {
              scheduleNextAlarm();
              console.log("[SYNC_FLOW] Stage 3: Native Alarms Refreshed.");
            } catch (err) {
              console.error("[SYNC_FLOW] Stage 3 FAILURE: Alarms may be out of sync.", err);
            }

            // SUCCESS CLEANUP: Hide handles and dismiss modal
            setDragConfirm({ visible: false });
            setSelectedCalendarEvent(undefined); 
        } else if (result.error === "OVERLAP_DETECTED") {
            // BACKEND REJECTION: Handle schedule collisions gracefully
            setDragConfirm(prev => ({ 
                ...prev, 
                visible: true, 
                isOverlapError: true,
                overlapMessage: result.message
            }));
        } else {
            console.warn("[SYNC_FLOW] Backend rejected update without explicit reason.");
            setDragConfirm({ visible: false });
        }
    } catch (error: any) {
        console.error("[SYNC_FLOW] CRITICAL FAILURE: Persistence layer crashed.", error);
        Alert.alert("Sync Error", "Critical failure while reaching the server.");
        setDragConfirm({ visible: false });
    }
  }, [dragConfirm, updateInstance, db]);

  // --- 5. RENDER LIFECYCLE ---

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UView className="flex-1 bg-black relative">
          
          {/* Static Time Marker Axis (Floating Header) */}
          <UView className="absolute top-5 left-0 w-[17%] items-center z-10 pointer-events-none">
               <UText className="text-white font-bold ">Time</UText>
          </UView>

          <CalendarKit
            ref={calendarRef}
            numberOfDays={3}
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
            
            // Interaction API Configuration
            selectedEvent={selectedCalendarEvent} // Handles visualization
            onDragSelectedEventEnd={handleDragSelectedEventEnd} // Mutation trigger
            onLongPressEvent={handleEventLongPress} // Explicit select
            onPressEvent={handleEventPress} // Navigation
            onPressBackground={() => setSelectedCalendarEvent(undefined)} // Deselect
            
            // Core Logic Hooks
            onChange={() => handleVisibleDateChange(calendarRef)}
          >
            <CalendarHeader />
            <CalendarBody renderEvent={renderEvent} />
          </CalendarKit>

          {/* ASYNC Hydration Shimmer Overlay */}
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

          {/* Temporal Mutation Confirm: Prevents accidental rescheduling */}
          <ConfirmationModal
            visible={dragConfirm.visible}
            title={
                dragConfirm.isOverlapError 
                    ? (dragConfirm.overlapMessage || "Schedule Conflict")
                    : (dragConfirm.event && dragConfirm.newStart 
                        ? `Update "${dragConfirm.event.title || 'Event'}" to ${dayjs(dragConfirm.newStart).format('h:mm A')} - ${dayjs(dragConfirm.newEnd).format('h:mm A')} on ${dayjs(dragConfirm.newStart).format('DD MMM')}?`
                        : "Confirm Temporal Shift?")
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
