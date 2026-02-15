import { create } from 'zustand';
import dayjs from 'dayjs';

// Define the Event type based on what I saw in verify.tsx
export type CalendarEvent = {
  id: string;
  title: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  color: string;
  recurrenceRule?: string;
};

const INITIAL_EVENTS: CalendarEvent[] = [
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

type CalendarStore = {
  events: CalendarEvent[];
  selectedEvent: any | null;
  setEvents: (events: CalendarEvent[]) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  addEvent: (event: CalendarEvent) => void;
  setSelectedEvent: (event: any | null) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
};

// Logger middleware
const logger = (config: any) => (set: any, get: any, api: any) =>
  config(
    (...args: any[]) => {
      const actionName = args[2] ?? "anonymous";
      
      // Execute the state update
      set(...args);
      
      // Get the new state
      const state = get();
      
      console.log(`\n[CalendarStore] 🔄 ${actionName}`);
      console.log("─────────────────────────────────────────────────────────");
      console.log(`{
  eventsCount: ${state.events.length},
  selectedEventId: ${state.selectedEvent?.id || 'null'},
  selectedEvent: ${JSON.stringify(state.selectedEvent, null, 2)},
  lastEvent: ${JSON.stringify(state.events[state.events.length - 1] || null, null, 2)}
}`);
      console.log("─────────────────────────────────────────────────────────\n");
    },
    get,
    api
  );

export const useCalendarStore = create<CalendarStore>()(
  logger((set) => ({
    events: INITIAL_EVENTS,
    selectedEvent: null,
    setEvents: (events: CalendarEvent[]) => set({ events }, false, "calendar/setEvents"),
    updateEvent: (id: string, updates: Partial<CalendarEvent>) =>
      set(
        (state: CalendarStore) => ({
          events: state.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
          selectedEvent:
            state.selectedEvent?.id === id ? { ...state.selectedEvent, ...updates } : state.selectedEvent,
        }),
        false,
        "calendar/updateEvent"
      ),
    addEvent: (event: CalendarEvent) => 
      set(
        (state: CalendarStore) => ({ events: [...state.events, event] }),
        false,
        "calendar/addEvent"
      ),
    setSelectedEvent: (event: any | null) => 
      set({ selectedEvent: event }, false, "calendar/setSelectedEvent"),
    selectedDate: dayjs().toISOString(),
    setSelectedDate: (date: string) => set({ selectedDate: date }, false, "calendar/setSelectedDate"),
  }))
);
