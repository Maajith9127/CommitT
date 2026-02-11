import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  runOnJS 
} from 'react-native-reanimated';
import { View, Text, StyleSheet } from 'react-native';
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
import { withUniwind } from 'uniwind';
import { useQuery } from 'convex/react';
import { api } from '@commit/backend/convex/_generated/api';
import { useCalendarStore } from '@/stores/useCalendarStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CalendarShimmer } from '@/components/ui/skeletons/CalendarShimmer';

// Uniwind components
const UView = withUniwind(View);
const UText = withUniwind(Text);

// Color palette for cycling through task colors
const TASK_COLORS = [
  '#4FA0FF', '#FF6B6B', '#4CD964', '#FFD93D', '#6C5CE7',
  '#A29BFE', '#FD79A8', '#00CEC9', '#E17055', '#0984E3',
];

// Buffer threshold: refetch when within 2 weeks of range edge
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

// Compute a ±2 month range centered on a given timestamp
function computeRange(centerMs: number) {
  const start = new Date(centerMs);
  start.setMonth(start.getMonth() - 2);
  const end = new Date(centerMs);
  end.setDate(end.getDate() + 6);
  end.setMonth(end.getMonth() + 2);
  return { rangeStart: start.getTime(), rangeEnd: end.getTime() };
}

// Helper: get initial range (today ± 2 months)
function getInitialRange() {
  return computeRange(Date.now());
}

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
    background: '#1A1A1A',
    onBackground: '#ffffff',
    border: '#333333',
    text: '#ffffff',
    surface: '#1A1A1A',
    onSurface: '#cccccc',
  },
  hourBackgroundColor: '#000000',
  minuteBackgroundColor: '#000000',
  headerBackgroundColor: '#000000',
  dayName: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  dayNumber: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  hourTextStyle: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  eventContainerStyle: { borderRadius:7,padding:5},
    eventTitleStyle: {
      fontSize: 15,
      color:"#ffffff"
    },
};


export default function SchedulesScreen() {
  const calendarRef = useRef<CalendarKitRef>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevEventsRef = useRef<any[]>([]);

  // Listen to Zustand selectedDate for "Today" button navigation
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  useEffect(() => {
    if (calendarRef.current && selectedDate) {
      calendarRef.current.goToDate({ date: selectedDate, animatedDate: true });
    }
  }, [selectedDate]);

  // Animated skeleton state
  const [showSkeleton, setShowSkeleton] = useState(true);
  const skeletonOpacity = useSharedValue(1);

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  useEffect(() => {
    // Keep skeleton for 4 seconds, then fade out
    const timer = setTimeout(() => {
      skeletonOpacity.value = withTiming(0, { duration: 800 }, (finished) => {
        if (finished) {
          runOnJS(setShowSkeleton)(false);
        }
      });
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Range state — drives the Convex subscription
  const [range, setRange] = useState(getInitialRange);

  // Convex reactive subscription — re-fetches when range changes
  const instances = useQuery(api.api.instances.list.byRange, {
    rangeStart: range.rangeStart,
    rangeEnd: range.rangeEnd,
  });


  
  console.log(`[Calendar] Render: instances=${instances ? instances.length : 'undefined'}, range=${range.rangeStart}-${range.rangeEnd}`);

  // Transform DB instances → CalendarKit events (no Zustand)
  const events = useMemo(() => {
    if (!instances) return prevEventsRef.current; // Keep old events while loading
    console.log(`[Calendar] Fetched ${instances.length} instances:`, JSON.stringify(instances.slice(0, 3)));


    const taskColorMap = new Map<string, string>();
    let colorIndex = 0;

    const mapped = instances.map((inst: any) => {
      if (!taskColorMap.has(inst.task_id)) {
        taskColorMap.set(inst.task_id, TASK_COLORS[colorIndex % TASK_COLORS.length]);
        colorIndex++;
      }
      return {
        id: inst._id,
        title: inst.title,
        start: { dateTime: new Date(inst.start).toISOString() },
        end: { dateTime: new Date(inst.end).toISOString() },
        color: taskColorMap.get(inst.task_id) || '#4FA0FF',
      };
    });
    console.log(`[Calendar] Transformed events sample:`, mapped);
    prevEventsRef.current = mapped; // Cache for next refetch
    return mapped;
  }, [instances]);

  // Renderers
  // Renderers

  const renderEvent = useCallback((event: any) => {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' }}>
          {event.title}
        </Text>
      </View>
    );
  }, []);



  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UView className="flex-1 bg-black relative">
          <UView className="absolute top-5 left-0 w-[60px] items-center z-10">
               <UText className="text-white font-bold">Time</UText>
          </UView>

          <CalendarKit
            ref={calendarRef}
            numberOfDays={7}
            locale="en"
            initialLocales={initialLocales}
            hourFormat="h A"
            theme={customTheme}
            minTimeIntervalHeight={30}
            initialTimeIntervalHeight={40}
            events={events}
            useHaptic={true}
            allowPinchToZoom={false}
            onChange={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => {
                const visibleStart = calendarRef.current?.getVisibleStart();
                if (!visibleStart) return;
                const visibleMs = new Date(visibleStart).getTime();

                // Check if we're within 2 weeks of either edge
                const nearStart = visibleMs < range.rangeStart + TWO_WEEKS_MS;
                const nearEnd = visibleMs > range.rangeEnd - TWO_WEEKS_MS;

                if (nearStart || nearEnd) {
                  // Re-center the range around current visible date
                  const newRange = computeRange(visibleMs);
                  setRange(newRange);
                  console.log(`[Calendar] REFETCH — near ${nearStart ? 'start' : 'end'} edge. New range: ${new Date(newRange.rangeStart).toISOString()} → ${new Date(newRange.rangeEnd).toISOString()}`);
                } else {
                  console.log(`[Calendar] Safe — no refetch needed`);
                }
              }, 1000);
            }}
          >
            <CalendarHeader />
            <CalendarBody 
                renderEvent={renderEvent}
            />
          </CalendarKit>

          {/* Skeleton Overlay */}
          {showSkeleton && (
            <Animated.View 
              style={[
                { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 50 }, 
                animatedOverlayStyle
              ]}
              pointerEvents="none" // Allow touches to pass through during fade out? No, block touches until gone.
            >
              <CalendarShimmer />
            </Animated.View>
          )}
      </UView>
    </GestureHandlerRootView>
  );
}


