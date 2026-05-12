import { THEME } from '@/constants/theme';

/**
 * Calendar Configuration
 * 
 * Centralized configuration for the CalendarKit component and related logic.
 * Includes themes, locales, color palettes, and constants.
 */

// Color palette for cycling through task colors.
export const TASK_COLORS = [
  THEME.colors.primary, 
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
    primary: THEME.colors.primary,
    onPrimary: THEME.colors.pureWhite,
    background: THEME.colors.surface,
    onBackground: THEME.colors.textMain,
    border: THEME.colors.pureBlack,
    text: THEME.colors.textMain,
    surface: THEME.colors.surface,
    onSurface: THEME.colors.textMuted,
  },

  hourBackgroundColor: THEME.colors.pureBlack,
  minuteBackgroundColor: THEME.colors.pureBlack,
  headerBackgroundColor: THEME.colors.pureBlack,

  hourBorderColor: THEME.colors.pureBlack,
  headerBorderColor: THEME.colors.pureBlack,
  dayBarBorderColor: THEME.colors.pureBlack,

  nowIndicatorColor: THEME.colors.primary,

  dayName: { color: THEME.colors.textMain, fontSize: 13, fontWeight: 'bold' },
  dayNumber: { color: THEME.colors.textMain, fontSize: 25, fontWeight: 'bold' },
  hourTextStyle: { color: THEME.colors.textMain, fontSize: 13, fontWeight: 'bold' },

  eventContainerStyle: { borderRadius: THEME.radii.sm, padding: 8 },
  eventTitleStyle: {
    fontSize: 15,
    color: THEME.colors.pureWhite
  },

  /**
   * WORKAROUND: visually thicker grid
   * CalendarKit internally fixes grid width at 1px,
   * so we overlay borders on containers.
   */

  dayContainer: {
    borderRightWidth: 1.5,
    borderColor: THEME.colors.pureBlack,
  },

  singleDayContainer: {
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: THEME.colors.pureBlack,
  },

  unavailableHourContainerStyle: {
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: THEME.colors.pureBlack,
  },

  headerContainer: {
    borderBottomWidth: 1.5,
    borderBottomColor: THEME.colors.pureBlack,
  },
};
