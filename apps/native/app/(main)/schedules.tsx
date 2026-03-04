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

  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<any>(undefined);

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

  const setRange = useCalendarStore((state) => state.setRange);
  useEffect(() => {
    setRange(range.rangeStart, range.rangeEnd);
  }, [range.rangeStart, range.rangeEnd]);

  // Loading Micro-Interaction: Controls skeleton visibility and fade animations
  const { showSkeleton, animatedOverlayStyle } = useSkeletonAnimation();

  const selectedDate = useCalendarStore((state) => state.selectedDate);
  const setSelectedEventId = useCalendarStore((state) => state.setSelectedEventId);

  useEffect(() => {
    if (calendarRef.current && selectedDate) {
      calendarRef.current.goToDate({ date: selectedDate, animatedDate: true });
    }
  }, [selectedDate]);

  // --- 3. COMPONENT RENDERING & USER INTERACTION ---

  const renderEvent = useCallback((event: any) => {
    // Determine start/end times from the event object structure
    const start = dayjs(event.originalData?.start || event.start?.dateTime || event.start);
    const end = dayjs(event.originalData?.end || event.end?.dateTime || event.end);
    const timeStr = `${start.format('h:mm')} - ${end.format('h:mm A')}`;

    const isEdited = event.originalData?.is_manual_edit;

    return (
      <UView className="flex-1 p-2 items-start justify-start">
        <UText className="text-white font-bold text-[14px]" numberOfLines={2}>
          {event.title}
        </UText>
        <UText className="text-white text-[12px] opacity-80 mt-1" numberOfLines={1}>
          {timeStr}
        </UText>
        {isEdited && (
          <UText className="text-red-500 font-bold text-[10px] mt-1 uppercase" numberOfLines={1}>
            Edited
          </UText>
        )}
      </UView>
    );
  }, []);

  const handleEventPress = useCallback((event: any) => {
    const eventData = event.originalData || event;
    setSelectedEventId(eventData._id, eventData);
  }, [setSelectedEventId]);

  const handleEventLongPress = useCallback((event: any) => {
    setSelectedCalendarEvent(event);
  }, []);

  const handleDragSelectedEventEnd = useCallback((...args: any[]) => {
    let [event, newStart, newEnd] = args;
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

  const executeEventUpdate = useCallback(async () => {
    if (!dragConfirm.event || !dragConfirm.newStart || !dragConfirm.newEnd) return;
    
    const instanceId = dragConfirm.event._id || dragConfirm.event.id;

    try {
        const result = await updateInstance({
            id: instanceId,
            start: new Date(dragConfirm.newStart).getTime(),
            end: new Date(dragConfirm.newEnd).getTime(),
        });

        if (result.success && result.instance) {
            await updateSingleInstanceInLocalDb(db, result.instance as any);
            try {
              scheduleNextAlarm();
            } catch (err) {}
            setDragConfirm({ visible: false });
            setSelectedCalendarEvent(undefined); 
        } else if (result.error === "OVERLAP_DETECTED") {
            setDragConfirm(prev => ({ 
                ...prev, 
                visible: true, 
                isOverlapError: true,
                overlapMessage: result.message
            }));
        } else {
            setDragConfirm({ visible: false });
        }
    } catch (error: any) {
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
            renderEvent={renderEvent}
            selectedEvent={selectedCalendarEvent} 
            onDragSelectedEventEnd={handleDragSelectedEventEnd} 
            onLongPressEvent={handleEventLongPress} 
            onPressEvent={handleEventPress} 
            onPressBackground={() => setSelectedCalendarEvent(undefined)} 
            onChange={() => handleVisibleDateChange(calendarRef)}
          >
            <CalendarHeader />
            <CalendarBody />
          </CalendarKit>

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
