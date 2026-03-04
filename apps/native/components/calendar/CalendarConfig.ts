/**
 * Calendar Configuration
 * 
 * Centralized configuration for the CalendarKit component and related logic.
 * Includes themes, locales, color palettes, and constants.
 */

// Color palette for cycling through task colors.
export const TASK_COLORS = [
  '#4FA0FF', 
];

// Buffer threshold for infinite scrolling.
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
    border: '#000000',
    text: '#ffffff',
    surface: '#1A1A1A',
    onSurface: '#cccccc',
  },

  hourBackgroundColor: '#000000',
  minuteBackgroundColor: '#000000',
  headerBackgroundColor: '#000000',

  hourBorderColor: '#000000',
  headerBorderColor: '#000000',
  dayBarBorderColor: '#000000',

  nowIndicatorColor: 'red',


  dayName: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  dayNumber: { color: '#ffffff', fontSize: 25, fontWeight: 'bold' },
  hourTextStyle: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },

  eventContainerStyle: { borderRadius: 0, padding: 10 },
  eventTitleStyle: {
    fontSize: 15,
    color: "#ffffff"
  },

  /**
   * WORKAROUND: visually thicker grid
   * CalendarKit internally fixes grid width at 1px,
   * so we overlay borders on containers.
   */

  dayContainer: {
    borderRightWidth: 2,
    borderColor: '#000000',
  },

  singleDayContainer: {
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#000000',
  },

  unavailableHourContainerStyle: {
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#000000',
  },

  headerContainer: {
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
};
