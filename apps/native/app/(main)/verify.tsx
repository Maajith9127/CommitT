import React, { useCallback, useRef } from 'react';
import { StyleSheet, SafeAreaView as RNSafeAreaView, View, Text, Button } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CalendarKit, { 
  CalendarBody, 
  CalendarHeader,
  DraggableEvent,
  DraggingEvent,
  DraggableEventProps,
  DraggingEventProps,
  CalendarKitRef,
} from '@howljs/calendar-kit';
import dayjs from 'dayjs';
import { useCalendarStore } from '../../stores/useCalendarStore';




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
  timeLabel: { color: '#ffffff' },
};

export default function VerifyScreen() {
  const { events, selectedEvent, setEvents, updateEvent, addEvent, setSelectedEvent } = useCalendarStore();
  const calendarRef = useRef<CalendarKitRef>(null);

  const zoomIn = () => {
    calendarRef.current?.zoom({ scale: 1.5 });
  };

  const zoomOut = () => {
    calendarRef.current?.zoom({ scale: 0.75 });
  };

  const setSpecificZoom = () => {
    calendarRef.current?.zoom({ height: 90 });
  };


  const onDragEventEnd = (event: any, newStart: any, newEnd: any) => {
    console.log('[Verify] onDragEventEnd hit', { eventId: event.id, newStart, newEnd });

    // Fallback: If newStart/newEnd are undefined, the library might have updated 'event' directly
    // or passed them in a different way. Let's try to find the best source.
    const startSource = newStart ?? event.start;
    const endSource = newEnd ?? event.end;

    // Helper to get ISO string from various possible formats (Date, object, string)
    const getIso = (val: any) => {
        if (!val) return undefined;
        if (typeof val === 'string') return val;
        if (val instanceof Date) return val.toISOString();
        if (val.dateTime) return val.dateTime;
        if (val.date) return val.date; // Use date if dateTime is missing (all-day fallback)
        return undefined;
    };

    const finalStart = getIso(startSource);
    const finalEnd = getIso(endSource);

    console.log('[Verify] Resolved times:', { finalStart, finalEnd });

    if (!finalStart || !finalEnd) {
        console.warn('[Verify] Could not resolve start or end time during drag');
        return;
    }

    // Determine if we should use dateTime (timed) or date (all-day)
    // Heuristic: If it looks like a full ISO string with time, use dateTime.
    // If it's YYYY-MM-DD, use date. 
    // For now, assuming granular drag implies dateTime.
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
    console.log('[Verify] onDragCreateEventEnd', event);
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
    console.log('[Verify] onDragSelectedEventEnd', { eventId: event.id, newStart, newEnd });

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

  const renderDraggingEvent = useCallback((props: DraggingEventProps) => {
    return (
      <DraggingEvent
        {...props}
        TopEdgeComponent={
          <View
            style={{
              height: 10,
              width: '100%',
              backgroundColor: 'red',
              position: 'absolute',
            }}
          />
        }
        BottomEdgeComponent={
          <View
            style={{
              height: 10,
              width: '100%',
              backgroundColor: 'red',
              bottom: 0,
              position: 'absolute',
            }}
          />
        }
      />
    );
  }, []);

  const renderDraggableEvent = useCallback(
    (props: DraggableEventProps) => (
      <DraggableEvent
        {...props}
        TopEdgeComponent={
          <View
            style={{
              height: 15,
              backgroundColor: 'red',
              position: 'absolute',
              width: '100%',
              zIndex: 100,
            }}>
            <Text style={{ textAlign: 'center', fontSize: 10, color: 'white', fontWeight: 'bold' }}>Drag</Text>
          </View>
        }
        BottomEdgeComponent={
          <View
            style={{
              height: 15,
              backgroundColor: 'red',
              position: 'absolute',
              bottom: 0,
              width: '100%',
              zIndex: 100,
            }}>
            <Text style={{ textAlign: 'center', fontSize: 10, color: 'white', fontWeight: 'bold' }}>Drag</Text>
          </View>
        }
      />
    ),
    []
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RNSafeAreaView style={styles.container}>
        <CalendarKit
          ref={calendarRef}
          numberOfDays={3}
          locale="en"
          initialLocales={initialLocales}
          hourFormat="hh:mm a"
          events={events}
          allowDragToEdit={true}
          allowDragToCreate={true}
          onDragEventEnd={onDragEventEnd}
          onDragCreateEventEnd={onDragCreateEventEnd}
          onDragSelectedEventEnd={onDragSelectedEventEnd}
          selectedEvent={selectedEvent}
          onPressEvent={onPressEvent}
          useHaptic={true}
          theme={customTheme}
          allowPinchToZoom={true}
          minTimeIntervalHeight={30}
          initialTimeIntervalHeight={60}
        >
          <CalendarHeader />
          <CalendarBody 
            renderDraggingEvent={renderDraggingEvent}
            renderDraggableEvent={renderDraggableEvent}
          />
        </CalendarKit>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 10 }}>
          <Button title="Zoom In" onPress={zoomIn} />
          <Button title="Zoom Out" onPress={zoomOut} />
          <Button title="Set Height 90" onPress={setSpecificZoom} />
        </View>
      </RNSafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000ff',
  },
});
