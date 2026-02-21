import dayjs from "dayjs";
import type { TaskDraft } from "@/stores/useTaskDraftStore";

/**
 * TimeSlot represents an individual instance of a task.
 */
export interface TimeSlot {
  start_time: number; // Unix timestamp in milliseconds
  end_time: number;   // Unix timestamp in milliseconds
}

/**
 * Generates an array of Unix timestamps representing the start and end of every future instance
 * for the next year based on the recurrence rules.
 */
export function generateTaskInstances(recurrence: TaskDraft["recurrence"]): TimeSlot[] {
  const instances: TimeSlot[] = [];
  
  if (!recurrence || !recurrence.time_windows || recurrence.time_windows.length === 0) {
    return instances;
  }

  const startDate = dayjs(); // Today
  const endDate = startDate.add(1, "year"); // Exactly 1 year from now
  const daysOfWeek = recurrence.days_of_week || [0, 1, 2, 3, 4, 5, 6];

  let currentDate = startDate;
  
  while (currentDate.isBefore(endDate)) {
    // JavaScript dayjs().day() returns 0 for Sunday, 6 for Saturday.
    const currentDayOfWeek = currentDate.day(); 
    
    if (daysOfWeek.includes(currentDayOfWeek)) {
      for (const window of recurrence.time_windows) {
        // time_windows are stored as seconds from midnight
        const startSeconds = window.start;
        const endSeconds = window.end;
        
        const startDayjs = currentDate.startOf("day").add(startSeconds, "second");
        const endDayjs = currentDate.startOf("day").add(endSeconds, "second");
        
        // Skip instances that have already happened TODAY relative to current time
        if (endDayjs.isAfter(dayjs())) {
          instances.push({
            start_time: startDayjs.valueOf(),
            end_time: endDayjs.valueOf(),
          });
        }
      }
    }
    
    currentDate = currentDate.add(1, "day");
  }

  instances.sort((a, b) => a.start_time - b.start_time);
  return instances;
}
