import type React from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { usePermissionStatus } from "../hooks/usePermissionStatus";

interface PermissionRequestButtonProps {
  style?: any;
  disabled?: boolean;
}

export const PermissionRequestButton: React.FC<
  PermissionRequestButtonProps
> = ({ style, disabled = false }) => {
  const { requestInProgress, requestPermission } = usePermissionStatus();

  const handlePress = async () => {
    try {
      const success = await requestPermission();
      if (!success) {
        Alert.alert(
          "Permission Request Failed",
          "Unable to open settings. Please grant usage access permission manually in Android Settings > Security & Privacy > Usage Access.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to request permission. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const isDisabled = disabled || requestInProgress;

  return (
    <TouchableOpacity
      accessibilityLabel="Request usage access permission"
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={handlePress}
      style={[styles.button, style, isDisabled && styles.disabled]}
    >
      {requestInProgress ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Text style={[styles.buttonText, isDisabled && styles.disabledText]}>
          Grant Permission
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 150,
  },
  disabled: {
    backgroundColor: "#cccccc",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledText: {
    color: "#999999",
  },
});
