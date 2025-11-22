import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import type { MonitoringEventPayload } from "@/lib/monitoring/types";

interface EventItemProps {
  event: MonitoringEventPayload & { id: string };
}

export const EventItem = ({ event }: EventItemProps) => {
  const getEventIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case "screen_event":
        return "phone-portrait";
      case "usage_event":
        return "apps";
      case "network_event":
        return "wifi";
      case "service_status":
        return "settings";
      default:
        return "information-circle";
    }
  };

  const getEventColor = (type: string): string => {
    switch (type) {
      case "screen_event":
        return "#3b82f6";
      case "usage_event":
        return "#22c55e";
      case "network_event":
        return "#f59e0b";
      case "service_status":
        return "#8b5cf6";
      default:
        return "#6b7280";
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) {
      return "Just now";
    }
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatEventData = (event: MonitoringEventPayload): string => {
    switch (event.type) {
      case "screen_event":
        return event.data.eventType;
      case "usage_event":
        return `${event.data.eventType}: ${event.data.packageName}`;
      case "network_event":
        return `Sent: ${event.data.bytesSent}B, Received: ${event.data.bytesReceived}B`;
      case "service_status":
        return `${event.data.status}: ${event.data.message}`;
      default:
        return "Unknown event";
    }
  };

  const formatEventTitle = (type: string): string => {
    switch (type) {
      case "screen_event":
        return "Screen Event";
      case "usage_event":
        return "App Usage";
      case "network_event":
        return "Network Activity";
      case "service_status":
        return "Service Status";
      default:
        return "Unknown Event";
    }
  };

  return (
    <View className="mb-2 rounded-lg border border-border bg-card p-3">
      <View className="flex-row items-center gap-3">
        <Ionicons
          color={getEventColor(event.type)}
          name={getEventIcon(event.type)}
          size={20}
        />
        <View className="flex-1">
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="font-medium text-foreground">
              {formatEventTitle(event.type)}
            </Text>
            <Text className="text-muted-foreground text-xs">
              {formatTimestamp(event.timestamp)}
            </Text>
          </View>
          <Text className="text-muted-foreground text-sm">
            {formatEventData(event)}
          </Text>
        </View>
      </View>
    </View>
  );
};
