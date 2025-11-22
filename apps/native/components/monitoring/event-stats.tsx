import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

interface EventStatsProps {
  totalEvents: number;
  filteredEvents: number;
  onClearEvents: () => void;
}

export const EventStats = ({
  totalEvents,
  filteredEvents,
  onClearEvents,
}: EventStatsProps) => (
  <View className="mb-4 flex-row items-center justify-between">
    <View className="flex-row items-center gap-2">
      <Ionicons color="#6b7280" name="stats-chart" size={16} />
      <Text className="text-muted-foreground text-sm">
        {filteredEvents} of {totalEvents} events
      </Text>
    </View>

    {totalEvents > 0 && (
      <TouchableOpacity
        accessibilityLabel="Clear all events"
        accessibilityRole="button"
        className="flex-row items-center gap-1 rounded-md bg-destructive/10 px-2 py-1"
        onPress={onClearEvents}
      >
        <Ionicons color="#ef4444" name="trash" size={14} />
        <Text className="font-medium text-destructive text-xs">Clear</Text>
      </TouchableOpacity>
    )}
  </View>
);
