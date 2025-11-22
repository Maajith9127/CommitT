import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const FilterChip = ({
  label,
  isActive,
  onPress,
  icon,
}: FilterChipProps) => (
  <TouchableOpacity
    accessibilityLabel={`Filter by ${label}`}
    accessibilityRole="button"
    accessibilityState={{ selected: isActive }}
    className={`flex-row items-center gap-1 rounded-full px-3 py-1 ${
      isActive ? "bg-primary" : "bg-secondary"
    }`}
    onPress={onPress}
  >
    {icon && (
      <Ionicons color={isActive ? "white" : "#6b7280"} name={icon} size={14} />
    )}
    <Text
      className={`font-medium text-xs ${
        isActive ? "text-primary-foreground" : "text-secondary-foreground"
      }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

interface FilterBarProps {
  activeFilters: string[];
  onFilterChange: (filter: string) => void;
}

export const FilterBar = ({
  activeFilters,
  onFilterChange,
}: FilterBarProps) => {
  const filters = [
    { key: "all", label: "All", icon: "list" as const },
    { key: "screen_event", label: "Screen", icon: "phone-portrait" as const },
    { key: "usage_event", label: "Usage", icon: "apps" as const },
    { key: "network_event", label: "Network", icon: "wifi" as const },
    { key: "service_status", label: "Service", icon: "settings" as const },
  ];

  return (
    <ScrollView
      className="mb-4"
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      <View className="flex-row gap-2">
        {filters.map((filter) => (
          <FilterChip
            icon={filter.icon}
            isActive={activeFilters.includes(filter.key)}
            key={filter.key}
            label={filter.label}
            onPress={() => onFilterChange(filter.key)}
          />
        ))}
      </View>
    </ScrollView>
  );
};
