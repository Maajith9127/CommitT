import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { withUniwind } from "uniwind";

import { AddButton, Input, PrimaryButton } from "@/components/ui";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { MiniConditionCard } from "@/components/ui/commits/MiniConditionCard";
import { CommitCard } from "@/components/ui/commits/DigitalCommitment";
import { HeaderTitle } from "@/components/ui/text";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

type Condition = {
  id: string;
  icon: string;
  title: string;
  subtitle?: string; 
};

export default function FinalScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const draft = useTaskDraftStore((s) => s.draft);

  // Metrics for MiniConditionCard carousel
  const horizontalPadding = 16;
  const cardGap = 8; 
  const visibleCards = 3.2;
  const cardWidth = (screenWidth - horizontalPadding * 2 - cardGap * Math.floor(visibleCards)) / visibleCards;

  const [conditions] = useState<Condition[]>([
    {
      id: "1",
      icon: "clock-outline",
      title: "Time",
    },
    {
      id: "2",
      icon: "map-marker-outline",
      title: "Location",
    },
    {
      id: "3",
      icon: "account-check-outline",
      title: "Partner",
    },
    {
      id: "4",
      icon: "camera-outline",
      title: "Picture",
    },
    {
      id: "5",
      icon: "video-outline",
      title: "Video",
    },
  ]);

  return (
    <UView className="flex-1 bg-black px-4 pt-20">
      {/* MAIN SCROLL AREA */}
      <UScroll showsVerticalScrollIndicator={false} className="flex-1">
        {/* TOP — ICON + NAME INPUT */}
        <UView className="mb-10 items-center">
          <MaterialCommunityIcons
            name="book"
            size={75}
            color="#4FA0FF"
            style={{ marginBottom: 16 }}
          />
          <Input placeholder="Commitment Name" />
        </UView>

        {/* CONDITIONS HEADER */}
        <UView className="mb-3 flex-row items-center justify-between">
          <HeaderTitle>Conditions</HeaderTitle>
          <AddButton onPress={() => {}} />
        </UView>

        {/* HORIZONTAL MINI CONDITION CARDS */}
        <UView>
          <UScroll horizontal showsHorizontalScrollIndicator={false} className="mb-6 flex-row">
            {conditions.map((condition, index) => {
              let isSelected = false;

              if (condition.title === "Time") {
                // Check if any time condition exists
                isSelected = draft.conditions.some(c => c.metric === "time");
              } else if (condition.title === "Location") {
                // Check if location is set
                isSelected = !!draft.location;
              }

              return (
                <MiniConditionCard
                  key={condition.id}
                  icon={condition.icon}
                  title={condition.title}
                  width={cardWidth}
                  className={`h-20 ${index < conditions.length - 1 ? "mr-2" : ""}`}
                  selected={isSelected}
                  selectionColor="#4FA0FF"
                  onPress={() => {
                    if (condition.title === "Time") {
                      router.push("/(create-commit)/time-set");
                    } else if (condition.title === "Location") {
                      router.push("/(create-commit)/location-set");
                    }
                  }}
                />
              );
            })}
          </UScroll>
        </UView>

        {/* DIGITAL COMMITMENT — CLICKABLE AREA */}
        <UView className="mb-3">
          <HeaderTitle>Digital Commitment</HeaderTitle>
        </UView>

        <CommitCard className="mb-5" onPress={() => router.push("/(create-commit)/choose")} />

        {/* PENALTIES HEADER */}
        <UView className="mt-2 mb-3">
          <HeaderTitle>Penalties</HeaderTitle>
        </UView>

        {/* PENALTY CARD */}
        <ConditionCard
          icon="alert-circle-outline"
          iconColor="#FF3B30"
          title="Penalty"
          subtitle="₹500 will be deducted if you miss this commitment"
          onPress={() => router.push("/(create-commit)/penalties")}
          className="h-28 border-[3px] border-red-500 pb-4"
        />

        {/* PENALTY WAIVER HEADER */}
        <UView className="mt-3 mb-3">
          <HeaderTitle>Penalty Waiver</HeaderTitle>
        </UView>

        {/* PENALTY WAIVER CARD */}
        <ConditionCard
          icon="check-decagram-outline"
          iconColor="#4CD964"
          title="Penalty Waiver"
          subtitle="Solve 100 CAPTCHAs to waive the penalty"
          onPress={() => router.push("/(create-commit)/penaltywaivers")}
          className="h-28 border-[#4CD964] border-[3px] pb-4"
        />
      </UScroll>

      {/* FIXED FOOTER BUTTON */}
      <UView className="mb-10">
        <PrimaryButton onPress={() => router.push("/(settings)/permissions")}>
          CommitT
        </PrimaryButton>
      </UView>
    </UView>
  );
}
