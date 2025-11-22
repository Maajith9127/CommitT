import { useCallback, useState } from "react";
import { Alert, Linking, ScrollView, Text, View } from "react-native";

import { Container } from "@/components/container";
import {
  ActionButton,
  DataCard,
  StatusIndicator,
} from "@/components/monitoring";
import { useMonitoring } from "@/lib/monitoring";
import type { DailySummary, UsageData } from "@/lib/monitoring/types";

export default function MonitoringControls() {
  const {
    isActive,
    hasPermission,
    isLoading,
    error,
    startMonitoring,
    stopMonitoring,
    requestPermission,
    getUsageData,
    getDailySummaries,
    syncData,
    clearError,
  } = useMonitoring();

  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);

  // Handle permission settings navigation
  const openPermissionSettings = useCallback(async () => {
    try {
      const settingsUrl = "android.settings.USAGE_ACCESS_SETTINGS";
      const canOpen = await Linking.canOpenURL(settingsUrl);

      if (canOpen) {
        await Linking.openURL(settingsUrl);
      } else {
        await Linking.openURL("android.settings.SETTINGS");
        Alert.alert(
          "Permission Settings",
          'Please navigate to "Special app access" > "Usage access" and enable it for this app.',
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Could not open settings. Please manually go to Settings > Apps > Special app access > Usage access and enable it for this app.",
        [{ text: "OK" }]
      );
    }
  }, []);

  // Handle start monitoring with permission check
  const handleStartMonitoring = useCallback(async () => {
    if (!hasPermission) {
      Alert.alert(
        "Permission Required",
        "Usage access permission is required to start monitoring. Please grant permission first.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: openPermissionSettings },
        ]
      );
      return;
    }

    const success = await startMonitoring();
    if (success) {
      Alert.alert("Success", "Monitoring started successfully");
    } else {
      Alert.alert("Error", "Failed to start monitoring");
    }
  }, [hasPermission, startMonitoring, openPermissionSettings]);

  // Handle stop monitoring
  const handleStopMonitoring = useCallback(async () => {
    const success = await stopMonitoring();
    if (success) {
      Alert.alert("Success", "Monitoring stopped successfully");
    } else {
      Alert.alert("Error", "Failed to stop monitoring");
    }
  }, [stopMonitoring]);

  // Handle permission request
  const handleRequestPermission = useCallback(async () => {
    const success = await requestPermission();
    if (success) {
      Alert.alert("Success", "Permission granted successfully");
    } else {
      Alert.alert(
        "Error",
        "Failed to request permission. Please try opening settings manually."
      );
    }
  }, [requestPermission]);

  // Handle get usage data
  const handleGetUsageData = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const data = await getUsageData(today, today);
    setUsageData(data);

    if (data.length === 0) {
      Alert.alert("Usage Data", "No usage data available for today");
    }
  }, [getUsageData]);

  // Handle get daily summary
  const handleGetDailySummary = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const summaries = await getDailySummaries(today, today);
    const summary = summaries[0] || null;
    setDailySummary(summary);

    if (!summary) {
      Alert.alert("Daily Summary", "No data available for today");
    }
  }, [getDailySummaries]);

  // Handle sync data
  const handleSyncData = useCallback(async () => {
    const success = await syncData();
    if (success) {
      Alert.alert("Success", "Data synced successfully");
    } else {
      Alert.alert("Error", "Failed to sync data");
    }
  }, [syncData]);

  return (
    <Container>
      <ScrollView className="flex-1">
        <View className="px-4 py-6">
          {/* Status Section */}
          <View className="mb-6 rounded-lg border border-border bg-card p-4">
            <Text className="mb-4 font-semibold text-foreground text-lg">
              Monitoring Status
            </Text>

            <View className="gap-3">
              <StatusIndicator isActive={isActive} label="Status" />
              <StatusIndicator
                icon={hasPermission ? "checkmark-circle" : "close-circle"}
                isActive={hasPermission}
                label="Permission"
              />
            </View>

            {/* Permission Settings Button */}
            {!hasPermission && (
              <View className="mt-4">
                <View className="mb-3 rounded-md bg-orange-50 p-3 dark:bg-orange-900/20">
                  <Text className="text-orange-800 text-sm dark:text-orange-200">
                    <Text className="font-medium">
                      Usage Access Permission Required
                    </Text>
                    {"\n"}This permission allows the app to monitor usage
                    statistics for analytics and productivity tracking.
                  </Text>
                </View>
                <ActionButton
                  icon="settings"
                  onPress={openPermissionSettings}
                  title="Open Usage Access Settings"
                  variant="secondary"
                />
              </View>
            )}

            {/* Error Display */}
            {error && (
              <View className="mt-4 rounded-md bg-destructive/10 p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 text-destructive text-sm">
                    Error: {error}
                  </Text>
                  <ActionButton
                    icon="close"
                    onPress={clearError}
                    title=""
                    variant="danger"
                  />
                </View>
                {error.includes("not a function") && (
                  <Text className="mt-2 text-destructive text-xs">
                    Note: The native monitoring module may not be available.
                    Please rebuild the app after adding native code.
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Controls Section */}
          <View className="mb-6 rounded-lg border border-border bg-card p-4">
            <Text className="mb-4 font-semibold text-foreground text-lg">
              Controls
            </Text>

            <View className="gap-3">
              <ActionButton
                disabled={isLoading}
                icon={isActive ? "stop" : "play"}
                isLoading={isLoading}
                onPress={
                  isActive ? handleStopMonitoring : handleStartMonitoring
                }
                title={isActive ? "Stop Monitoring" : "Start Monitoring"}
                variant={isActive ? "danger" : "primary"}
              />

              <ActionButton
                disabled={isLoading}
                icon="shield-checkmark"
                isLoading={isLoading}
                onPress={handleRequestPermission}
                title="Request Permission"
                variant="secondary"
              />

              <ActionButton
                disabled={isLoading}
                icon="analytics"
                isLoading={isLoading}
                onPress={handleGetUsageData}
                title="Get Usage Data"
                variant="secondary"
              />

              <ActionButton
                disabled={isLoading}
                icon="bar-chart"
                isLoading={isLoading}
                onPress={handleGetDailySummary}
                title="Get Daily Summary"
                variant="secondary"
              />

              <ActionButton
                disabled={isLoading}
                icon="sync"
                isLoading={isLoading}
                onPress={handleSyncData}
                title="Sync Data"
                variant="secondary"
              />
            </View>
          </View>

          {/* Data Display Section */}
          {(usageData.length > 0 || dailySummary) && (
            <View className="rounded-lg border border-border bg-card p-4">
              <Text className="mb-4 font-semibold text-foreground text-lg">
                Current Data
              </Text>

              {usageData.length > 0 && (
                <DataCard
                  data={{
                    count: usageData.length,
                    totalDuration: usageData.reduce(
                      (sum, session) => sum + session.duration,
                      0
                    ),
                    activeSessions: usageData.filter(
                      (session) => session.isActive
                    ).length,
                  }}
                  icon="apps"
                  title="Usage Sessions"
                />
              )}

              {dailySummary && (
                <DataCard
                  data={{
                    totalUsageTime: dailySummary.totalUsageTime,
                    sessionCount: dailySummary.sessionCount,
                    idleTime: dailySummary.idleTime,
                    lastUpdated: dailySummary.lastUpdated,
                  }}
                  icon="bar-chart"
                  title="Today's Summary"
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </Container>
  );
}
