import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";
import { ScreenHeader } from "@/components/ui";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { AuthTitle, HeaderTitle } from "@/components/ui/text";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

export default function ConditionsScreen() {
  const router = useRouter();

  return (
    <UView className="flex-1 bg-black">
      {/* HEADER ONLY */}
      <ScreenHeader>
        <HeaderTitle className="mt-16 text-3xl text-blue-400">CommitT Conditions</HeaderTitle>

        <AuthTitle className="mt-1 mb-0 text-left text-gray-400">
          Choose how you want to verify
        </AuthTitle>
      </ScreenHeader>

      {/* SCROLL CONTENT BELOW */}
      <UScroll className="mt-4 px-4">
        <ConditionCard
          icon="clock-outline"
          title="Time"
          subtitle="Set time range"
          onPress={() => router.push("/(create-commit)/time-set")}
        />

        <ConditionCard
          icon="map-marker-outline"
          title="Location"
          subtitle="Verify at specific place"
          onPress={() => router.push("/(create-commit)/location-set")}
        />

        <ConditionCard
          icon="account-check-outline"
          title="Accountability Partner"
          subtitle="Someone verifies you"
          onPress={() => router.push("/(create-commit)/partner-select")}
        />

        <ConditionCard
          icon="camera-outline"
          title="Picture Proof"
          subtitle="Upload a photo"
          onPress={() => router.push("/(create-commit)/picture-capture")}
        />

        <ConditionCard
          icon="video-outline"
          title="Video Proof"
          subtitle="Record a video"
          onPress={() => router.push("/(create-commit)/video-record")}
        />
      </UScroll>
    </UView>
  );
}
