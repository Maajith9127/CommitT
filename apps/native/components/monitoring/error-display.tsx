import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

interface ErrorDisplayProps {
  error: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  variant?: "error" | "warning" | "info";
}

export const ErrorDisplay = ({
  error,
  onDismiss,
  onRetry,
  variant = "error",
}: ErrorDisplayProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "error":
        return {
          container: "bg-destructive/10 border-destructive/20",
          text: "text-destructive",
          icon: "alert-circle" as const,
          iconColor: "#ef4444",
        };
      case "warning":
        return {
          container: "bg-yellow-500/10 border-yellow-500/20",
          text: "text-yellow-600",
          icon: "warning" as const,
          iconColor: "#f59e0b",
        };
      case "info":
        return {
          container: "bg-blue-500/10 border-blue-500/20",
          text: "text-blue-600",
          icon: "information-circle" as const,
          iconColor: "#3b82f6",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <View className={`rounded-lg border p-4 ${styles.container}`}>
      <View className="flex-row items-start gap-3">
        <Ionicons color={styles.iconColor} name={styles.icon} size={20} />

        <View className="flex-1">
          <Text className={`text-sm ${styles.text}`}>{error}</Text>

          {error.includes("not a function") && (
            <Text className={`mt-2 text-xs ${styles.text}`}>
              Note: The native monitoring module may not be available. Please
              rebuild the app after adding native code.
            </Text>
          )}
        </View>

        <View className="flex-row gap-2">
          {onRetry && (
            <TouchableOpacity
              accessibilityLabel="Retry operation"
              accessibilityRole="button"
              className="rounded-md bg-primary/10 px-2 py-1"
              onPress={onRetry}
            >
              <Ionicons color="#3b82f6" name="refresh" size={14} />
            </TouchableOpacity>
          )}

          {onDismiss && (
            <TouchableOpacity
              accessibilityLabel="Dismiss error"
              accessibilityRole="button"
              className="rounded-md bg-gray-500/10 px-2 py-1"
              onPress={onDismiss}
            >
              <Ionicons color="#6b7280" name="close" size={14} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};
