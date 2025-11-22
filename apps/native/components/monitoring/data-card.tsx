import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface DataCardProps {
  title: string;
  data: Record<string, unknown>;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const DataCard = ({ title, data, icon }: DataCardProps) => {
  const formatValue = (value: unknown): string => {
    if (typeof value === "number") {
      if (value > 1000 * 60 * 60) {
        // Hours
        return `${Math.round((value / (1000 * 60 * 60)) * 10) / 10}h`;
      }
      if (value > 1000 * 60) {
        // Minutes
        return `${Math.round((value / (1000 * 60)) * 10) / 10}m`;
      }
      if (value > 1000) {
        // Seconds
        return `${Math.round((value / 1000) * 10) / 10}s`;
      }
      return value.toString();
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    if (value === null || value === undefined) {
      return "N/A";
    }
    return String(value);
  };

  return (
    <View className="rounded-lg border border-border bg-card p-4">
      <View className="mb-3 flex-row items-center gap-2">
        {icon && <Ionicons color="#6b7280" name={icon} size={20} />}
        <Text className="font-semibold text-foreground text-lg">{title}</Text>
      </View>

      <View className="gap-2">
        {Object.entries(data).map(([key, value]) => (
          <View className="flex-row justify-between" key={key}>
            <Text className="text-muted-foreground capitalize">
              {key.replace(/([A-Z])/g, " $1").trim()}:
            </Text>
            <Text className="font-medium text-foreground">
              {formatValue(value)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
