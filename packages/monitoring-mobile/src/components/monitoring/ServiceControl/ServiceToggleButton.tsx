import type React from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMonitoringService } from "../hooks/useMonitoringService";

interface ServiceToggleButtonProps {
  style?: any;
}

export const ServiceToggleButton: React.FC<ServiceToggleButtonProps> = ({
  style,
}) => {
  const { isActive, isLoading, error, startMonitoring, stopMonitoring } =
    useMonitoringService();

  const handlePress = async () => {
    try {
      if (isActive) {
        await stopMonitoring();
      } else {
        await startMonitoring();
      }
    } catch (err) {
      Alert.alert(
        "Error",
        `Failed to ${isActive ? "stop" : "start"} monitoring service`,
        [{ text: "OK" }]
      );
    }
  };

  const getButtonText = () => {
    if (isLoading) return "Loading...";
    return isActive ? "Stop Monitoring" : "Start Monitoring";
  };

  const getButtonColor = () => {
    if (error) return "#ff4444"; // Red for error
    if (isActive) return "#ff4444"; // Red for stop
    return "#4CAF50"; // Green for start
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        accessibilityLabel={
          isActive ? "Stop monitoring service" : "Start monitoring service"
        }
        accessibilityRole="button"
        disabled={isLoading}
        onPress={handlePress}
        style={[styles.button, { backgroundColor: getButtonColor() }]}
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        )}
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#ff4444",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
});
