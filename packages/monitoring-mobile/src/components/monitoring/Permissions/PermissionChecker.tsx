import type React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { usePermissionStatus } from "../hooks/usePermissionStatus";
import { PermissionRequestButton } from "./PermissionRequestButton";

interface PermissionCheckerProps {
  style?: any;
  showHelpButton?: boolean;
}

export const PermissionChecker: React.FC<PermissionCheckerProps> = ({
  style,
  showHelpButton = true,
}) => {
  const { usageStatsGranted, isChecking, requestInProgress } =
    usePermissionStatus();

  const getStatusIcon = () => {
    if (isChecking) return "⏳";
    return usageStatsGranted ? "✅" : "❌";
  };

  const getStatusText = () => {
    if (isChecking) return "Checking permission...";
    return usageStatsGranted ? "Permission granted" : "Permission required";
  };

  const getStatusColor = () => {
    if (isChecking) return "#ffa500";
    return usageStatsGranted ? "#4CAF50" : "#ff4444";
  };

  const getDescriptionText = () => {
    if (usageStatsGranted) {
      return "The app can monitor your usage statistics and screen activity.";
    }
    return "Usage access permission is required to monitor app usage and screen activity.";
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{getStatusIcon()}</Text>
        <Text style={[styles.title, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      <Text style={styles.description}>{getDescriptionText()}</Text>

      {!usageStatsGranted && (
        <View style={styles.actions}>
          <PermissionRequestButton disabled={isChecking || requestInProgress} />

          {showHelpButton && (
            <Text
              onPress={() => {
                Alert.alert(
                  "Usage Access Permission",
                  "This permission allows the app to monitor which apps you use and for how long. This data is stored locally on your device and is used to provide usage analytics.\n\nThe permission is required for:\n• Tracking app usage duration\n• Monitoring screen activity\n• Generating usage reports",
                  [{ text: "OK" }]
                );
              }}
              style={styles.helpText}
            >
              Learn more
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
    marginBottom: 12,
  },
  actions: {
    alignItems: "center",
  },
  helpText: {
    fontSize: 14,
    color: "#007AFF",
    marginTop: 12,
    textDecorationLine: "underline",
  },
});
