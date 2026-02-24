import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { HeaderTitle } from "@/components/ui/text";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useVerificationStore } from "@/stores/useVerificationStore";
import { useState, useEffect } from "react";
import dayjs from "dayjs";

import { SkeletonBlock } from '@/components/ui/skeletons/SkeletonBlock';

const UView = withUniwind(View);
const UText = withUniwind(Text);

export type VerificationCardProps = {
  title?: string;
  description?: string;
  className?: string;

  challenge?: string;
  timeUntil?: string;

  //  CONTROLLED NAVIGATION
  onPress?: () => void;
};

export function VerificationCard({
  className = "",
}: VerificationCardProps) {
  const nextEvent = useVerificationStore((state: any) => state.upcomingEvent);
  const setSelectedEventId = useCalendarStore((state: any) => state.setSelectedEventId);

  const [timeText, setTimeText] = useState("Loading...");

  useEffect(() => {
    console.log("[VerificationCard] Next Pending Event:", nextEvent ? { id: nextEvent._id, title: nextEvent.title, start: nextEvent.start } : "None");
  }, [nextEvent]);

  useEffect(() => {
    if (!nextEvent) {
      setTimeText("No Upcoming");
      return;
    }

    const updateTime = () => {
        const now = dayjs();
        const start = dayjs(nextEvent.start);
        const diff = start.diff(now);

        if (diff <= 0) {
            // Check for overdue/delay
            const absDiff = Math.abs(diff);
            const h = Math.floor(absDiff / 3600000);
            const m = Math.floor((absDiff % 3600000) / 60000);
            
            if (absDiff < 60000) { 
                setTimeText("Now"); 
            } else {
                setTimeText(`Overdue ${h}h ${m}m`);
            }
        } else {
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            if (h > 0) {
                setTimeText(`In ${h}h ${m}m`);
            } else {
                setTimeText(`In ${m}m`);
            }
        }
    };

    updateTime(); // Initial
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [nextEvent]);

  const handlePress = () => {
    if (nextEvent) {
        // Push both the ID and the full event data into Zustand's single-event slot
        setSelectedEventId(nextEvent._id, nextEvent);
    }
  };

  // Content for "No Instances" state handled below by fallback values
  
  const title = nextEvent?.title || "No Task";
  const displayTime = nextEvent ? timeText : "N/A";
  const displayTitle = "Upcoming Verification";

  return (
    <UView className={`mt-4 ${className}`}>
      {/* OUTER TOUCH AREA */}
      <UView className="rounded-3xl">
        {/* INNER CARD */}
        <UView className="rounded-4xl bg-[#1A1A1A] px-4 pt-2 pb-4">
          {/* TITLE ROW */}
          <UView className="mb-2 flex-row items-center justify-between">
            <HeaderTitle className="pt-3 text-white text-xl">{displayTitle}</HeaderTitle>

            <MaterialCommunityIcons name="shield-alert-outline" size={22} color="#8A8A8A" />
          </UView>

          <UText className="mb-4 text-base text-gray-400">Start your verification.</UText>

          {/* PRIMARY BUTTON - ONLY THIS NAVIGATES */}
          <PrimaryButton className="mb-4" onPress={handlePress} disabled={!nextEvent}>
            Start Verification
          </PrimaryButton>

          {/* CHALLENGE + TIME MERGED */}
          <UView className="w-full flex-row items-center justify-between bg-[#2A2A2A] rounded-4xl border border-dashed border-white/30 px-6 py-3">
            {!nextEvent && timeText === "Loading..." ? (
                <>
                    <SkeletonBlock width={80} height={20} borderRadius={4} />
                    <SkeletonBlock width={60} height={20} borderRadius={4} />
                </>
            ) : (
                <>
                    <UText className="text-white font-bold text-base">{title}</UText>
                    <UText className="text-white font-bold text-base">{displayTime}</UText>
                </>
            )}
          </UView>
        </UView>
      </UView>
    </UView>
  );
}
