/**
 * useCalendarStore
 * 
 * Centralized state management for calendar synchronization and event selection.
 * 
 * State Responsibilities:
 * - events: Collection of verified/pending task instances for the calendar viewport.
 * - rangeStart/End: Current temporal bounds of the calendar viewport (ms epoch).
 * - selectedEventId: Primary identifier for the active event (controls Modal visibility).
 * - selectedEventTaskId: Identifier used to establish live backend subscriptions.
 * - selectedEvent: Static data snapshot used for immediate rendering during live sync transitions.
 * - selectedDate: The current date focused in the viewport.
 * 
 * Reactive Architecture:
 * This store implements a snapshot-to-live transition pattern.
 * Upon selection, the UI seeds from the static 'selectedEvent' for instant availability,
 * while 'selectedEventTaskId' triggers a live Convex subscription in the background.
 */

import { create } from 'zustand';
import dayjs from 'dayjs';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Shape of a calendar event (used by BigCalendar and the events array) */
export type CalendarEvent = {
  id: string;
  title: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  color: string;
  recurrenceRule?: string;
};

// ─── Initial Seed Data (development only) ───────────────────────────────────

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

// ─── Store Shape ────────────────────────────────────────────────────────────

type CalendarStore = {
  // ── Calendar Events ──
  events: CalendarEvent[];
  setEvents: (events: CalendarEvent[]) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  addEvent: (event: CalendarEvent) => void;

  // ── Visible Date Range (epoch ms) ──
  rangeStart: number;
  rangeEnd: number;
  setRange: (start: number, end: number) => void;

  // ── Currently Selected Event (Powers EventDetailModal) ──
  /** 
   * The Convex `_id` of the selected task instance. 
   * Setting this to a non-null value triggers the root Modal to slide up.
   */
  selectedEventId: string | null;

  /** 
   * The reactive trigger for the Live Backend Subscription.
   * Changing this ID causes the EventDetailModal to establish a fresh `useQuery`.
   */
  selectedEventTaskId: string | null;

  /** 
   * Initial static data snapshot. 
   * Prevents "Loading" flickers by providing immediate data while the live query syncs.
   */
  selectedEvent: any | null;

  /**
   * Opens or closes the modal atomically.
   * @param id - The instance ID to open (or null to close)
   * @param eventData - The initial snapshot to show during the transition to live
   */
  setSelectedEventId: (id: string | null, eventData?: any) => void;

  // ── Selected Date (for the header date picker) ──
  selectedDate: string;
  setSelectedDate: (date: string) => void;
};

// ─── Debug Logger Middleware ─────────────────────────────────────────────────
// Wraps every Zustand action with a console.log showing the action name
// and the resulting state. Useful for debugging state flow in development.

const logger = (config: any) => (set: any, get: any, api: any) =>
  config(
    (...args: any[]) => {
      const actionName = args[2] ?? "anonymous";
      
      set(...args);
      
      const state = get();
      
      console.log(`\n[CalendarStore] Action: ${actionName}`);
      console.log("---------------------------------------------------------");
      console.log(`{
  eventsCount: ${state.events.length},
  selectedEventId: ${state.selectedEventId || 'null'},
  selectedEventTaskId: ${state.selectedEventTaskId || 'null'},
  range: [${dayjs(state.rangeStart).format('DD MMM')} - ${dayjs(state.rangeEnd).format('DD MMM')}],
  itemsCount: ${state.events.length}
}`);
      console.log("---------------------------------------------------------\n");
    },
    get,
    api
  );

// ─── Store Creation ─────────────────────────────────────────────────────────

export const useCalendarStore = create<CalendarStore>()(
  logger((set) => ({
    // ── Initial State ──
    events: INITIAL_EVENTS,
    rangeStart: dayjs().startOf('month').valueOf(),
    rangeEnd: dayjs().endOf('month').valueOf(),
    selectedEventId: null,
    selectedEventTaskId: null,
    selectedEvent: null,
    selectedDate: dayjs().toISOString(),

    // ── Actions ──
    setEvents: (events: CalendarEvent[]) =>
      set({ events }, false, "calendar/setEvents"),

    setRange: (start: number, end: number) =>
      set({ rangeStart: start, rangeEnd: end }, false, "calendar/setRange"),

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

    /**
     * Atomically sets the selected event ID and its full data.
     * This single action controls the EventDetailModal's visibility and content.
     */
    setSelectedEventId: (id: string | null, eventData?: any) =>
      set(
        { 
          selectedEventId: id, 
          selectedEventTaskId: id, // Mapping 1:1 for the experiment
          selectedEvent: eventData ?? null 
        },
        false,
        "calendar/setSelectedEventId"
      ),

    setSelectedDate: (date: string) =>
      set({ selectedDate: date }, false, "calendar/setSelectedDate"),
  }))
);
