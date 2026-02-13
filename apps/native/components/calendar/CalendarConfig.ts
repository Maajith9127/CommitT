/**
 * Calendar Configuration
 * 
 * Centralized configuration for the CalendarKit component and related logic.
 * Includes themes, locales, color palettes, and constants.
 */

// Color palette for cycling through task colors.
// Selected for high contrast against dark backgrounds.
export const TASK_COLORS = [
  '#4FA0FF', '#FF6B6B', '#4CD964', '#FFD93D', '#6C5CE7',
  '#A29BFE', '#FD79A8', '#00CEC9', '#E17055', '#0984E3',
];

// Buffer threshold for infinite scrolling.
// We refetch when the user scrolls within 2 weeks of the currently loaded range edge.
export const REF_FETCH_BUFFER_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks

// CalendarKit Locale Configuration
export const INITIAL_LOCALES = {
  en: {
    weekDayShort: 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
    meridiem: { ante: 'am', post: 'pm' },
    more: 'more',
  },
};

// CalendarKit Custom Theme (Dark Mode)
export const CUSTOM_THEME = {
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
  eventContainerStyle: { borderRadius: 7, padding: 5 },
  eventTitleStyle: {
    fontSize: 15,
    color: "#ffffff"
  },
};
