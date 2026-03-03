/**
 * FORMATTERS
 * 
 * Standardized date and time formatting utilities for the backend.
 * Ensures consistent localization (Asia/Kolkata) across all logs and user messages.
 */

/**
 * Formats a unix timestamp into a 12-hour time string (e.g. "10:30 AM")
 */
export const formatTime = (ts: number): string => 
  new Date(ts).toLocaleTimeString("en-IN", { 
    hour: "numeric", 
    minute: "2-digit", 
    hour12: true,
    timeZone: "Asia/Kolkata" 
  });

/**
 * Formats a unix timestamp into a short date string (e.g. "03 Mar")
 */
export const formatDate = (ts: number): string =>
  new Date(ts).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata"
  });

/**
 * Formats a start and end timestamp into a readable range (e.g. "10:00 AM - 11:30 AM")
 */
export const formatTimeRange = (start: number, end: number): string => {
  return `${formatTime(start)} - ${formatTime(end)}`;
};
