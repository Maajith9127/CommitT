import type React from "react";
import { useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { type LogEntry, useEventLogs } from "../hooks/useEventLogs";
import { EventItem } from "./EventItem";

interface EventLogViewerProps {
  style?: any;
  maxItems?: number;
}

export const EventLogViewer: React.FC<EventLogViewerProps> = ({
  style,
  maxItems = 50,
}) => {
  const { logs, isLoading, error, refreshLogs, lastFetched } = useEventLogs();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshLogs();
    setRefreshing(false);
  };

  const handleEventPress = (event: LogEntry) => {
    Alert.alert(
      event.title,
      `${event.description}\n\nTimestamp: ${new Date(event.timestamp).toLocaleString()}`,
      [{ text: "OK" }]
    );
  };

  const displayedLogs = logs.slice(0, maxItems);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📝</Text>
      <Text style={styles.emptyTitle}>No Events Yet</Text>
      <Text style={styles.emptyDescription}>
        Start monitoring to see usage events and activity logs here.
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Failed to Load Logs</Text>
      <Text style={styles.errorDescription}>{error}</Text>
      <TouchableOpacity onPress={refreshLogs} style={styles.retryButton}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Event Logs</Text>
        {lastFetched && (
          <Text style={styles.lastUpdated}>
            Updated:{" "}
            {lastFetched.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        )}
      </View>

      {error ? (
        renderError()
      ) : (
        <FlatList
          contentContainerStyle={
            displayedLogs.length === 0 ? styles.emptyList : undefined
          }
          data={displayedLogs}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              colors={["#007AFF"]}
              onRefresh={handleRefresh}
              refreshing={refreshing || isLoading}
              tintColor="#007AFF"
            />
          }
          renderItem={({ item }) => (
            <EventItem event={item} onPress={handleEventPress} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {logs.length > maxItems && (
        <Text style={styles.moreIndicator}>
          Showing {maxItems} of {logs.length} events
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
  },
  lastUpdated: {
    fontSize: 12,
    color: "#666666",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ff4444",
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyList: {
    flexGrow: 1,
  },
  moreIndicator: {
    textAlign: "center",
    fontSize: 12,
    color: "#666666",
    paddingVertical: 8,
    backgroundColor: "#ffffff",
  },
});
