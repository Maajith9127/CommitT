import type React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { EventLogViewer } from "./LogViewer/EventLogViewer";
import { PermissionChecker } from "./Permissions/PermissionChecker";
import { ServiceStatusIndicator } from "./ServiceControl/ServiceStatusIndicator";
import { ServiceToggleButton } from "./ServiceControl/ServiceToggleButton";

interface MonitoringDashboardProps {
  style?: any;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  style,
}) => (
  <View style={[styles.container, style]}>
    <ScrollView
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      style={styles.scrollView}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Usage Monitor</Text>
        <Text style={styles.subtitle}>Track app usage and screen activity</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        <PermissionChecker />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Control</Text>
        <ServiceStatusIndicator />
        <ServiceToggleButton style={styles.toggleButton} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Logs</Text>
        <EventLogViewer />
      </View>
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 12,
    marginLeft: 4,
  },
  toggleButton: {
    marginTop: 12,
  },
});
