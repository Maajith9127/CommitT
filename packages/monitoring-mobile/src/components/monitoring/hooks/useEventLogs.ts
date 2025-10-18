import { useCallback, useEffect, useState } from "react";
import MonitoringMobile from "../../../MonitoringMobileModule";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: "usage" | "summary" | "screen" | "network" | "service";
  title: string;
  description: string;
  data?: any;
}

export interface EventLogsState {
  logs: LogEntry[];
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export const useEventLogs = () => {
  const [state, setState] = useState<EventLogsState>({
    logs: [],
    isLoading: false,
    error: null,
    lastFetched: null,
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      end: new Date(),
    },
  });

  const formatDateForAPI = (date: Date): string => {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD format
  };

  const loadLogs = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const startDate = formatDateForAPI(state.dateRange.start);
      const endDate = formatDateForAPI(state.dateRange.end);

      // Fetch usage data and daily summaries
      const [usageData, dailySummaries] = await Promise.all([
        MonitoringMobile.getUsageData(startDate, endDate),
        MonitoringMobile.getDailySummaries(startDate, endDate),
      ]);

      // Convert to log entries
      const logEntries: LogEntry[] = [];

      // Add usage sessions
      usageData.forEach((session, index) => {
        logEntries.push({
          id: `usage-${session.id}-${index}`,
          timestamp: session.startTime,
          type: "usage",
          title: `App Usage: ${session.appPackage}`,
          description: `Duration: ${Math.round(session.duration / 1000)}s`,
          data: session,
        });
      });

      // Add daily summaries
      dailySummaries.forEach((summary, index) => {
        logEntries.push({
          id: `summary-${summary.date}-${index}`,
          timestamp: summary.lastUpdated,
          type: "summary",
          title: `Daily Summary: ${summary.date}`,
          description: `Usage: ${Math.round(summary.totalUsageTime / 1000)}s, Idle: ${Math.round(summary.idleTime / 1000)}s, Sessions: ${summary.sessionCount}`,
          data: summary,
        });
      });

      // Sort by timestamp (newest first)
      logEntries.sort((a, b) => b.timestamp - a.timestamp);

      setState((prev) => ({
        ...prev,
        logs: logEntries,
        isLoading: false,
        lastFetched: new Date(),
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load logs",
      }));
    }
  }, [state.dateRange]);

  const setDateRange = useCallback((start: Date, end: Date) => {
    setState((prev) => ({
      ...prev,
      dateRange: { start, end },
    }));
  }, []);

  const refreshLogs = useCallback(() => {
    loadLogs();
  }, [loadLogs]);

  // Load logs on mount and when date range changes
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return {
    ...state,
    setDateRange,
    refreshLogs,
  };
};
