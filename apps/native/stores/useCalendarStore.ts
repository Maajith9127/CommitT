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
  rangeStart: number;
  rangeEnd: number;
  selectedEventId: string | null;
  /** The full event data for the currently selected event (single slot, one at a time) */
  selectedEvent: any | null;
  setEvents: (events: CalendarEvent[]) => void;
  setRange: (start: number, end: number) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  addEvent: (event: CalendarEvent) => void;
  /** Sets both the ID and the full event data in one action */
  setSelectedEventId: (id: string | null, eventData?: any) => void;
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
  selectedEventId: ${state.selectedEventId || 'null'},
  range: [${dayjs(state.rangeStart).format('DD MMM')} - ${dayjs(state.rangeEnd).format('DD MMM')}],
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
    rangeStart: dayjs().startOf('month').valueOf(),
    rangeEnd: dayjs().endOf('month').valueOf(),
    selectedEventId: null,
    selectedEvent: null,
    setEvents: (events: CalendarEvent[]) => set({ events }, false, "calendar/setEvents"),
    setRange: (start: number, end: number) => set({ rangeStart: start, rangeEnd: end }, false, "calendar/setRange"),
    updateEvent: (id: string, updates: Partial<CalendarEvent>) =>
      set(
        (state: CalendarStore) => ({
          events: state.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
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
    setSelectedEventId: (id: string | null, eventData?: any) => 
      set({ selectedEventId: id, selectedEvent: eventData ?? null }, false, "calendar/setSelectedEventId"),
    selectedDate: dayjs().toISOString(),
    setSelectedDate: (date: string) => set({ selectedDate: date }, false, "calendar/setSelectedDate"),
  }))
);
