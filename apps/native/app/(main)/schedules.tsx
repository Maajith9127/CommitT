import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CalendarKit, { 
  CalendarBody, 
  CalendarHeader,
  CalendarKitRef,
  DraggableEvent,
  DraggingEvent,
  DraggableEventProps,
  DraggingEventProps,
} from '@howljs/calendar-kit';
import dayjs from 'dayjs';
import { withUniwind } from 'uniwind';

// Uniwind components
const UView = withUniwind(View);
const UText = withUniwind(Text);

// Configuration
const initialLocales = {
  en: {
    weekDayShort: 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
    meridiem: { ante: 'am', post: 'pm' },
    more: 'more',
  },
};

const customTheme = {
  colors: {
    primary: '#4FA0FF',
    onPrimary: '#ffffff',
    background: '#000000',
    onBackground: '#ffffff',
    border: '#333333',
    text: '#ffffff',
    surface: '#000000',
    onSurface: '#cccccc',
  },
  hourBackgroundColor: '#000000',
  minuteBackgroundColor: '#000000',
  headerBackgroundColor: '#000000',
  dayName: { color: '#ffffff' },
  dayNumber: { color: '#ffffff' },
  hourTextStyle: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
};

import { useCalendarStore } from '@/stores/useCalendarStore';


export default function SchedulesScreen() {
  const calendarRef = useRef<CalendarKitRef>(null);
  const { events, selectedEvent, updateEvent, addEvent, setSelectedEvent, selectedDate } = useCalendarStore();

  useEffect(() => {
    if (calendarRef.current && selectedDate) {
        calendarRef.current?.goToDate({ date: selectedDate, animatedDate: true });
    }
  }, [selectedDate]);

  // Event Handlers from verify.tsx
  const onDragEventEnd = (event: any, newStart: any, newEnd: any) => {
    console.log('[Schedules] onDragEventEnd hit', { eventId: event.id, newStart, newEnd });

    const startSource = newStart ?? event.start;
    const endSource = newEnd ?? event.end;

    const getIso = (val: any) => {
        if (!val) return undefined;
        if (typeof val === 'string') return val;
        if (val instanceof Date) return val.toISOString();
        if (val.dateTime) return val.dateTime;
        if (val.date) return val.date;
        return undefined;
    };

    const finalStart = getIso(startSource);
    const finalEnd = getIso(endSource);

    if (!finalStart || !finalEnd) {
        console.warn('[Schedules] Could not resolve start or end time during drag');
        return;
    }

    const isIsoDate = finalStart.includes('T');
    
    const timeUpdate = isIsoDate 
        ? { 
            start: { dateTime: finalStart, date: undefined }, 
            end: { dateTime: finalEnd, date: undefined } 
          }
        : { 
            start: { date: finalStart, dateTime: undefined }, 
            end: { date: finalEnd, dateTime: undefined } 
          };

    const existingEvent = events.find(e => e.id === event.id);
    if (existingEvent) {
      updateEvent(event.id, timeUpdate);
    }
  };

  const onDragCreateEventEnd = (event: any) => {
    console.log('[Schedules] onDragCreateEventEnd', event);
    const newEvent = {
      id: Math.random().toString(),
      title: 'New Event',
      start: event.start,
      end: event.end,
      color: '#333',
    };
    addEvent(newEvent);
  };

  const onDragSelectedEventEnd = (event: any, newStart: any, newEnd: any) => {
    console.log('[Schedules] onDragSelectedEventEnd', { eventId: event.id, newStart, newEnd });

    const startSource = newStart ?? event.start;
    const endSource = newEnd ?? event.end;

    const getIso = (val: any) => {
        if (!val) return undefined;
        if (typeof val === 'string') return val;
        if (val instanceof Date) return val.toISOString();
        if (val.dateTime) return val.dateTime;
        if (val.date) return val.date;
        return undefined;
    };

    const finalStart = getIso(startSource);
    const finalEnd = getIso(endSource);
    
    if (!finalStart || !finalEnd) {
         return;
    }

    const isIsoDate = finalStart.includes('T');
    const timeUpdate = isIsoDate 
        ? { 
            start: { dateTime: finalStart, date: undefined }, 
            end: { dateTime: finalEnd, date: undefined } 
          }
        : { 
            start: { date: finalStart, dateTime: undefined }, 
            end: { date: finalEnd, dateTime: undefined } 
          };

    const existingEvent = events.find(e => e.id === event.id);
    if (existingEvent) {
      updateEvent(existingEvent.id, timeUpdate);
    }
  };

  const onPressEvent = (event: any) => {
    setSelectedEvent(event);
  };

  // Renderers
  const renderDraggingEvent = useCallback((props: DraggingEventProps) => {
    return (
      <DraggingEvent
        {...props}
        TopEdgeComponent={
          <View style={styles.dragEdgeTop} />
        }
        BottomEdgeComponent={
          <View style={styles.dragEdgeBottom} />
        }
      />
    );
  }, []);

  const renderDraggableEvent = useCallback(
    (props: DraggableEventProps) => (
      <DraggableEvent
        {...props}
        TopEdgeComponent={
          <View style={styles.dragHandleTop}>
            <Text style={styles.dragText}>Drag</Text>
          </View>
        }
        BottomEdgeComponent={
          <View style={styles.dragHandleBottom}>
            <Text style={styles.dragText}>Drag</Text>
          </View>
        }
      />
    ),
    []
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UView className="flex-1 bg-black relative">
          {/* Corner Label - kept from original as part of calendar visual structure */}
          <UView className="absolute top-5 left-0 w-[60px] items-center z-10">
               <UText className="text-white font-bold">Time</UText>
          </UView>

          <CalendarKit
            ref={calendarRef}
            numberOfDays={3}
            locale="en"
            initialLocales={initialLocales}
            hourFormat="h a"
            theme={customTheme}
            minTimeIntervalHeight={30}
            initialTimeIntervalHeight={60}
            events={events} // Pass events
            selectedEvent={selectedEvent} // Pass selected event
            allowDragToEdit={true}
            allowDragToCreate={true}
            onDragEventEnd={onDragEventEnd}
            onDragCreateEventEnd={onDragCreateEventEnd}
            onDragSelectedEventEnd={onDragSelectedEventEnd}
            onPressEvent={onPressEvent}
            onPressBackground={() => setSelectedEvent(null)}
            useHaptic={true}
            allowPinchToZoom={true} // Why not also enable this since it was in verify?
            onChange={({ date }) => {
              // Optional: Update store if two-way binding desired, but layout drives this mostly.
            }}
          >
            <CalendarHeader />
            <CalendarBody 
                renderDraggingEvent={renderDraggingEvent}
                renderDraggableEvent={renderDraggableEvent}
            />
          </CalendarKit>
      </UView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  dragEdgeTop: {
    height: 10,
    width: '100%',
    backgroundColor: '#4FA0FF',
    position: 'absolute',
  },
  dragEdgeBottom: {
    height: 10,
    width: '100%',
    backgroundColor: '#4FA0FF',
    bottom: 0,
    position: 'absolute',
  },
  dragHandleTop: {
    height: 15,
    backgroundColor: '#4FA0FF',
    position: 'absolute',
    width: '100%',
    zIndex: 100,
    justifyContent: 'center',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4
  },
  dragHandleBottom: {
    height: 15,
    backgroundColor: '#4FA0FF',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    zIndex: 100,
    justifyContent: 'center',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4
  },
  dragText: {
    textAlign: 'center', 
    fontSize: 10, 
    color: 'white', 
    fontWeight: 'bold'
  }
});
