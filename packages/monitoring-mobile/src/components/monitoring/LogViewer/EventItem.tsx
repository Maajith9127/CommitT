import type React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { LogEntry } from "../hooks/useEventLogs";

interface EventItemProps {
  event: LogEntry;
  onPress?: (event: LogEntry) => void;
}

export const EventItem: React.FC<EventItemProps> = ({ event, onPress }) => {
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getEventIcon = () => {
    switch (event.type) {
      case "usage":
        return "📱";
      case "summary":
        return "📊";
      case "screen":
        return "📺";
      case "network":
        return "📡";
      case "service":
        return "⚙️";
      default:
        return "📝";
    }
  };

  const getEventColor = () => {
    switch (event.type) {
      case "usage":
        return "#4CAF50";
      case "summary":
        return "#2196F3";
      case "screen":
        return "#FF9800";
      case "network":
        return "#9C27B0";
      case "service":
        return "#607D8B";
      default:
        return "#666666";
    }
  };

  return (
    <TouchableOpacity
      accessibilityLabel={`${event.type} event: ${event.title}`}
      accessibilityRole="button"
      onPress={() => onPress?.(event)}
      style={styles.container}
    >
      <View style={styles.header}>
        <View
          style={[styles.iconContainer, { backgroundColor: getEventColor() }]}
        >
          <Text style={styles.icon}>{getEventIcon()}</Text>
        </View>
        <View style={styles.content}>
          <Text numberOfLines={1} style={styles.title}>
            {event.title}
          </Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(event.timestamp)}
          </Text>
        </View>
      </View>

      <Text numberOfLines={2} style={styles.description}>
        {event.description}
      </Text>

      <View style={styles.typeBadge}>
        <Text style={[styles.typeText, { color: getEventColor() }]}>
          {event.type.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  icon: {
    fontSize: 16,
    color: "#ffffff",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: "#666666",
  },
  description: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 18,
    marginBottom: 8,
  },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
