import type React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useMonitoringService } from "../hooks/useMonitoringService";

interface ServiceStatusIndicatorProps {
  style?: any;
  showLastChecked?: boolean;
}

export const ServiceStatusIndicator: React.FC<ServiceStatusIndicatorProps> = ({
  style,
  showLastChecked = true,
}) => {
  const { isActive, isLoading, error, lastChecked } = useMonitoringService();

  const getStatusText = () => {
    if (isLoading) return "Checking...";
    if (error) return "Error";
    return isActive ? "Active" : "Inactive";
  };

  const getStatusColor = () => {
    if (isLoading) return "#ffa500"; // Orange for loading
    if (error) return "#ff4444"; // Red for error
    return isActive ? "#4CAF50" : "#666666"; // Green for active, gray for inactive
  };

  const formatLastChecked = () =>
    lastChecked.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]}>
          {isLoading && <ActivityIndicator color="#ffffff" size="small" />}
        </View>
        <Text style={styles.statusText}>Monitoring: {getStatusText()}</Text>
      </View>

      {showLastChecked && (
        <Text style={styles.lastCheckedText}>
          Last checked: {formatLastChecked()}
        </Text>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginVertical: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333333",
  },
  lastCheckedText: {
    fontSize: 12,
    color: "#666666",
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#ff4444",
    marginTop: 8,
    textAlign: "center",
  },
});
