import React, { useState, useCallback, useRef } from 'react';
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

const INITIAL_EVENTS = [
  {
    id: '1',
    title: 'Briefing',
    start: { dateTime: dayjs().set('hour', 9).set('minute', 0).toISOString() },
    end: { dateTime: dayjs().set('hour', 9).set('minute', 30).toISOString() },
    color: '#4FA0FF',
  },
  {
    id: '2',
    title: 'Meetingg',
    start: { dateTime: dayjs().set('hour', 10).set('minute', 0).toISOString() },
    end: { dateTime: dayjs().set('hour', 12).set('minute', 0).toISOString() },
    color: '#4FA0FF',
  },
  {
    id: '3',
    title: 'Lunchhh',
    start: { dateTime: dayjs().set('hour', 13).set('minute', 0).toISOString() },
    end: { dateTime: dayjs().set('hour', 14).set('minute', 0).toISOString() },
    color: '#4FA0FF',
    recurrenceRule: 'RRULE:FREQ=DAILY',
  },
  {
    id: '4',
    title: 'Retreatttt',
    start: { date: dayjs().add(2, 'day').format('YYYY-MM-DD') },
    end: { date: dayjs().add(2, 'day').format('YYYY-MM-DD') },
    color: '#4FA0FF',
  },
];

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


const VerifyCalendar = ({ events, setEvents }: { events: any[], setEvents: React.Dispatch<React.SetStateAction<any[]>> }) => {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
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

  const onDragEventEnd = (event: any, newStart: string, newEnd: string) => {
    if (!newStart || !newEnd) return;
    setEvents((prev) => 
      prev.map((e) => 
        e.id === event.id 
          ? { ...e, start: { ...e.start, dateTime: newStart }, end: { ...e.end, dateTime: newEnd } } 
          : e
      )
    );
     if (selectedEvent?.id === event.id) {
         setSelectedEvent((prev: any) => ({ ...prev, start: { ...prev.start, dateTime: newStart }, end: { ...prev.end, dateTime: newEnd } }));
    }
    setRefreshKey(prev => prev + 1);
  };

  const onDragCreateEventEnd = (event: any) => {
    const newEvent = {
      id: Math.random().toString(),
      title: 'New Event',
      start: event.start,
      end: event.end,
      color: '#333',
    };
    setEvents((prev) => [...prev, newEvent]);
    setRefreshKey(prev => prev + 1);
  };

  const onDragSelectedEventEnd = (event: any, newStart: string, newEnd: string) => {
    if (!newStart || !newEnd) return;
    setEvents((prev) => 
      prev.map((e) => 
        e.id === event.id 
          ? { ...e, start: { ...e.start, dateTime: newStart }, end: { ...e.end, dateTime: newEnd } } 
          : e
      )
    );
    // Directly update selectedEvent state with new values to keep it in sync
    setSelectedEvent((prev: any) => prev ? { ...prev, start: { ...prev.start, dateTime: newStart }, end: { ...prev.end, dateTime: newEnd } } : null);
    setRefreshKey(prev => prev + 1);
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
              backgroundColor: 'red', // Keep red as per request
              position: 'absolute',
            }}
          />
        }
        BottomEdgeComponent={
          <View
            style={{
              height: 10,
              width: '100%',
              backgroundColor: 'red', // Keep red as per request
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
              backgroundColor: 'red', // Keep red as per request
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
              backgroundColor: 'red', // Keep red as per request
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
      <RNSafeAreaView style={styles.container}>
        <CalendarKit
          key={refreshKey}
          ref={calendarRef}
          numberOfDays={3}
          locale="en"
          initialLocales={initialLocales}
          hourFormat="hh:mm a"
          events={events} // Events passed from parent
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
  );
};

export default function VerifyScreen() {
  const [events, setEvents] = useState(INITIAL_EVENTS);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <VerifyCalendar events={events} setEvents={setEvents} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000ff',
  },
});
