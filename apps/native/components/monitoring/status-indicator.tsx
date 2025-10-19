import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

interface StatusIndicatorProps {
  isActive: boolean;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const StatusIndicator = ({ isActive, label, icon }: StatusIndicatorProps) => {
  const statusColor = isActive ? '#22c55e' : '#ef4444';
  const statusText = isActive ? 'Active' : 'Inactive';

  return (
    <View className="flex-row items-center gap-2">
      {icon ? (
        <Ionicons name={icon} size={16} color={statusColor} />
      ) : (
        <View
          className={`h-3 w-3 rounded-full ${
            isActive ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
      )}
      <Text className="text-foreground">
        {label}: {statusText}
      </Text>
    </View>
  );
};
