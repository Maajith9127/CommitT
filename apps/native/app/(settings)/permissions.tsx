import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { FooterText, HeaderTitle } from "@/components/ui/index";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

export default function PermissionsPage() {
  // TEMP VALUES — replace later with real permission logic
  const cameraGranted = false;
  const locationGranted = false;
  const notificationsGranted = false;
  const alarmsGranted = false;
  const batteryGranted = false;
  const appearGranted = false;
  const accessibilityGranted = false;

  const getColor = (granted: boolean) => (granted ? "#4FA0FF" : "#FF4D4D");

  return (
    <UScroll showsVerticalScrollIndicator={false} className="flex-1 bg-black px-5 pt-12">
      {/* TOP HEADER BLOCK */}
      <UView className="mb-10 items-center">
        <MaterialCommunityIcons name="cog-outline" size={100} color="#4FA0FF" />

        <HeaderTitle className="mt-4 text-3xl text-white">7 Permissions Needed</HeaderTitle>

        <FooterText className="mt-3 px-4 text-center text-gray-400">
          To ensure CommitT works properly, please enable these permissions. We do not store or
          share any personal data.
        </FooterText>
      </UView>

      {/* PERMISSIONS */}
      <ConditionCard
        icon="camera"
        title="Camera"
        subtitle="Required for live photo & video verification"
        iconColor={getColor(cameraGranted)}
        titleColor={getColor(cameraGranted)}
        className="bg-[#1A1A1A]"
      />

      <ConditionCard
        icon="map-marker-radius"
        title="Location"
        subtitle="Needed for 5km run and location-based tasks"
        iconColor={getColor(locationGranted)}
        titleColor={getColor(locationGranted)}
        className="bg-[#1A1A1A]"
      />

      <ConditionCard
        icon="bell-ring"
        title="Notifications"
        subtitle="For reminders and randomized checks"
        iconColor={getColor(notificationsGranted)}
        titleColor={getColor(notificationsGranted)}
        className="bg-[#1A1A1A]"
      />

      <ConditionCard
        icon="alarm"
        title="Alarms & Reminders"
        subtitle="Needed for wake-up commitments & schedules"
        iconColor={getColor(alarmsGranted)}
        titleColor={getColor(alarmsGranted)}
        className="bg-[#1A1A1A]"
      />

      <ConditionCard
        icon="battery-alert"
        title="Battery Optimization"
        subtitle="Disable to allow background tasks to run"
        iconColor={getColor(batteryGranted)}
        titleColor={getColor(batteryGranted)}
        className="bg-[#1A1A1A]"
      />

      <ConditionCard
        icon="monitor-screenshot"
        title="Appear On Top"
        subtitle="Required for anti-skip verification overlay"
        iconColor={getColor(appearGranted)}
        titleColor={getColor(appearGranted)}
        className="bg-[#1A1A1A]"
      />

      <ConditionCard
        icon="access-point"
        title="Accessibility"
        subtitle="Needed for app blocking & strict mode features"
        iconColor={getColor(accessibilityGranted)}
        titleColor={getColor(accessibilityGranted)}
        className="bg-[#1A1A1A]"
      />

      <UView className="h-10" />
    </UScroll>
  );
}
