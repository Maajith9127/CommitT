import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

interface EventStatsProps {
  totalEvents: number;
  filteredEvents: number;
  onClearEvents: () => void;
}

export const EventStats = ({ totalEvents, filteredEvents, onClearEvents }: EventStatsProps) => {
  return (
    <View className="mb-4 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <Ionicons name="stats-chart" size={16} color="#6b7280" />
        <Text className="text-muted-foreground text-sm">
          {filteredEvents} of {totalEvents} events
        </Text>
      </View>
      
      {totalEvents > 0 && (
        <TouchableOpacity
          onPress={onClearEvents}
          className="flex-row items-center gap-1 rounded-md bg-destructive/10 px-2 py-1"
          accessibilityRole="button"
          accessibilityLabel="Clear all events"
        >
          <Ionicons name="trash" size={14} color="#ef4444" />
          <Text className="text-destructive text-xs font-medium">Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
