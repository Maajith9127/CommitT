import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const FilterChip = ({ label, isActive, onPress, icon }: FilterChipProps) => {
  return (
    <TouchableOpacity
      className={`flex-row items-center gap-1 rounded-full px-3 py-1 ${
        isActive ? 'bg-primary' : 'bg-secondary'
      }`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
      accessibilityState={{ selected: isActive }}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={isActive ? 'white' : '#6b7280'}
        />
      )}
      <Text
        className={`text-xs font-medium ${
          isActive ? 'text-primary-foreground' : 'text-secondary-foreground'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

interface FilterBarProps {
  activeFilters: string[];
  onFilterChange: (filter: string) => void;
}

export const FilterBar = ({ activeFilters, onFilterChange }: FilterBarProps) => {
  const filters = [
    { key: 'all', label: 'All', icon: 'list' as const },
    { key: 'screen_event', label: 'Screen', icon: 'phone-portrait' as const },
    { key: 'usage_event', label: 'Usage', icon: 'apps' as const },
    { key: 'network_event', label: 'Network', icon: 'wifi' as const },
    { key: 'service_status', label: 'Service', icon: 'settings' as const },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-4"
    >
      <View className="flex-row gap-2">
        {filters.map((filter) => (
          <FilterChip
            key={filter.key}
            label={filter.label}
            isActive={activeFilters.includes(filter.key)}
            onPress={() => onFilterChange(filter.key)}
            icon={filter.icon}
          />
        ))}
      </View>
    </ScrollView>
  );
};
