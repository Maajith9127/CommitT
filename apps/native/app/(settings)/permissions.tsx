import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { FooterText, HeaderTitle } from "@/components/ui/index";

import { usePermissions } from "@/hooks/usePermissions";
import { Enforcement } from "@/modules/enforcement-module";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

export default function PermissionsPage() {
  const { permissions, isLoading, refresh } = usePermissions();

  /** State-based color mapping: Fail-Closed is Red, Enforcement-Ready is Green. */
  const getColor = (granted: boolean) => (granted ? "#4CD964" : "#FF3B30");

  const handleOpenSettings = (type: string) => {
    console.log(`[DEBUG] Attempting to open settings for: ${type}`);
    if (isLoading) {
      console.log("[DEBUG] Navigation blocked: permissions are currently loading.");
      return;
    }
    Enforcement.openSettings(type);
  };

  const cameraGranted = permissions.camera;
  const locationGranted = permissions.location;
  const notificationsGranted = permissions.notifications;
  const alarmsGranted = permissions.alarms;
  const batteryGranted = permissions.battery;
  const appearGranted = permissions.overlay;
  const accessibilityGranted = permissions.accessibility;
  const adminGranted = false; // Step 1: UI Placeholder only

  return (
    <UScroll showsVerticalScrollIndicator={false} className="flex-1 bg-black px-5 pt-12">
      {/* TOP HEADER BLOCK */}
      <UView className="mb-10 items-center">
        <MaterialCommunityIcons name="cog-outline" size={100} color="#4FA0FF" />

        <HeaderTitle className="mt-4 text-3xl text-white">8 Permissions Needed</HeaderTitle>
      </UView>

      {/* PERMISSIONS */}
      <ConditionCard
        icon="camera"
        title="Camera"
        subtitle="Required for live photo & video verification"
        iconColor={getColor(cameraGranted)}
        titleColor={getColor(cameraGranted)}
        className="bg-[#1A1A1A]"
        showArrow={true}
        onPress={() => handleOpenSettings("camera")}
      />

      <ConditionCard
        icon="map-marker-radius"
        title="Location"
        subtitle="Needed for 5km run and location-based tasks"
        iconColor={getColor(locationGranted)}
        titleColor={getColor(locationGranted)}
        className="bg-[#1A1A1A]"
        showArrow={true}
        onPress={() => handleOpenSettings("location")}
      />

      <ConditionCard
        icon="bell-ring"
        title="Notifications"
        subtitle="For reminders and randomized checks"
        iconColor={getColor(notificationsGranted)}
        titleColor={getColor(notificationsGranted)}
        className="bg-[#1A1A1A]"
        showArrow={true}
        onPress={() => handleOpenSettings("notifications")}
      />

      <ConditionCard
        icon="alarm"
        title="Alarms & Reminders"
        subtitle="Needed for wake-up commitments & schedules"
        iconColor={getColor(alarmsGranted)}
        titleColor={getColor(alarmsGranted)}
        className="bg-[#1A1A1A]"
        showArrow={true}
        onPress={() => handleOpenSettings("alarms")}
      />

      <ConditionCard
        icon="battery-alert"
        title="Battery Optimization"
        subtitle="Disable to allow background tasks to run"
        iconColor={getColor(batteryGranted)}
        titleColor={getColor(batteryGranted)}
        className="bg-[#1A1A1A]"
        showArrow={true}
        onPress={() => handleOpenSettings("battery")}
      />

      <ConditionCard
        icon="monitor-screenshot"
        title="Appear On Top"
        subtitle="Required for anti-skip verification overlay"
        iconColor={getColor(appearGranted)}
        titleColor={getColor(appearGranted)}
        className="bg-[#1A1A1A]"
        showArrow={true}
        onPress={() => handleOpenSettings("overlay")}
      />

      <ConditionCard
        icon="access-point"
        title="Accessibility"
        subtitle="Needed for app blocking & strict mode features"
        iconColor={getColor(accessibilityGranted)}
        titleColor={getColor(accessibilityGranted)}
        className="bg-[#1A1A1A]"
        showArrow={true}
        onPress={() => handleOpenSettings("accessibility")}
      />

      <ConditionCard
        icon="gavel"
        title="Device Admin"
        subtitle="Required to block any bypass attempt to remove the app."
        iconColor={getColor(adminGranted)}
        titleColor={getColor(adminGranted)}
        className="bg-[#1A1A1A]"
        showArrow={true}
        onPress={() => handleOpenSettings("admin")}
      />

      <UView className="h-10" />
    </UScroll>
  );
}
