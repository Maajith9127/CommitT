import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  icon?: keyof typeof Ionicons.glyphMap;
  isLoading?: boolean;
  disabled?: boolean;
}

export const ActionButton = ({
  title,
  onPress,
  variant = "primary",
  icon,
  isLoading = false,
  disabled = false,
}: ActionButtonProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-primary";
      case "secondary":
        return "bg-secondary";
      case "danger":
        return "bg-destructive";
      default:
        return "bg-primary";
    }
  };

  const getTextStyles = () => {
    switch (variant) {
      case "primary":
        return "text-primary-foreground";
      case "secondary":
        return "text-secondary-foreground";
      case "danger":
        return "text-destructive-foreground";
      default:
        return "text-primary-foreground";
    }
  };

  return (
    <TouchableOpacity
      accessibilityLabel={title}
      accessibilityRole="button"
      className={`${getVariantStyles()} flex-row items-center justify-center gap-2 rounded-lg px-4 py-3 ${
        disabled ? "opacity-50" : ""
      }`}
      disabled={disabled || isLoading}
      onPress={onPress}
    >
      {isLoading ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        icon && <Ionicons color="white" name={icon} size={20} />
      )}
      <Text className={`font-medium ${getTextStyles()}`}>{title}</Text>
    </TouchableOpacity>
  );
};
