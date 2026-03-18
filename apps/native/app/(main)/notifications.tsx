import { useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { withUniwind } from "uniwind";
import { TabsBar } from "@/components/ui/blocklist";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BodyText, FooterText } from "@/components/ui/text";
import dayjs from "dayjs";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UPress = withUniwind(Pressable);

type Tab = "upcoming" | "action_required" | "verified";

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "action_required", label: "Waiver" },
  { key: "verified", label: "Verified" },
];

// ─────────────────────────────────────────────────────────────────────────
// PROD DATA STRUCTURES
// ─────────────────────────────────────────────────────────────────────────

export interface TaskInstance {
  _id: string;
  _creationTime: number;
  title: string;
  description: string;
  start: number;
  end: number;
  status: string;
  config: any;
  conditions: any[];
  penalty: any;
  penalty_waiver: any;
  recurrence: any;
  task_id: string;
  _live_schedule_time?: number; // Directly injected exact Cron queue bomb timestamp
}

// ─────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────

function NotificationListItem({ instance, tabType }: { instance: TaskInstance, tabType: Tab }) {
  // Swapped to a perfectly crisp clock icon for upcoming events
  const iconName = tabType === "upcoming" ? "clock-outline" : tabType === "action_required" ? "alert-decagram-outline" : "check-decagram-outline";
  const formattedTime = dayjs(instance.start).format("MMM D, h:mm A");
  
  // Extract condition location gracefully
  const locationCondition = instance.conditions?.find((c: any) => c.metric_key === "location");
  const locName = locationCondition?.target?.value?.address?.split(",")[0];
  
  return (
    <UPress className="active:opacity-70">
      <UView className="flex-row items-start py-4 border-b border-[#2A2A2A] px-4">
        
        {/* Fixed Width Top-Aligned Icon Container */}
        <UView className="w-[44px] items-end mr-3">
          <MaterialCommunityIcons name={iconName} size={32} color="white" />
        </UView>

        {/* Flex Block mimicking X Notification Contexting */}
        <UView className="flex-1">
          {tabType === "upcoming" ? (
            <BodyText className="text-gray-300 text-[15px] leading-5">
              <BodyText className="font-bold text-white">{instance.title}</BodyText> is scheduled for {formattedTime}{locName ? ` at ${locName}` : ""}.
            </BodyText>
          ) : tabType === "action_required" ? (
            <UView className="flex-col">
              <BodyText className="text-gray-300 text-[15px] leading-5">
                <BodyText className="font-bold text-white">{instance.title}</BodyText> requires a waiver.
                {instance.penalty_waiver?.type === "captcha" 
                    ? ` Solve ${instance.penalty_waiver.config?.count || 'the'} CAPTCHAs to avoid the ` 
                    : ` Complete your challenge to avoid the `}
                {String(instance.penalty?.type || "penalty").replace('_', ' ')} consequence.
              </BodyText>

              {/* Added explicit expiry countdown text explicitly ordered */}
              {instance._live_schedule_time && (
                <BodyText className="text-[#FF4A4A] font-bold mt-1 text-[13px]">
                  Expires At: {dayjs(instance._live_schedule_time).format("MMM D, h:mm A")}
                </BodyText>
              )}
            </UView>
          ) : (
            <BodyText className="text-gray-300 text-[15px] leading-5">
              <BodyText className="font-bold text-white">{instance.title}</BodyText> was successfully verified at {formattedTime}.
            </BodyText>
          )}
        </UView>
        
      </UView>
    </UPress>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");

  // Fetch real data from Convex using our Prod-level backend route
  const data = useQuery(api.api.notifications.read.getGroups, { limit: 50 });

  // Safety fallback if Convex is still establishing websocket link
  if (data === undefined) {
    return (
      <UView className="flex-1 bg-black pt-2 items-center justify-center">
        <ActivityIndicator size="small" color="#4FA0FF" />
      </UView>
    );
  }

  const upcomingList = (data.upcoming || []) as any[];
  const waiversList = (data.action_required || []) as any[];
  const verifiedList = (data.verified || []) as any[];

  return (
    <UView className="flex-1 bg-black pt-2">
      {/* ── REUSED TABS COMPONENT ── */}
      <UView className="px-4">
        <TabsBar tabs={TABS} activeTab={activeTab} onChange={(key) => setActiveTab(key as Tab)} />
      </UView>

      {/* ── LIST CONTENT ── */}
      <UScroll className="flex-1 mt-2" showsVerticalScrollIndicator={false}>
        
        {/* UPCOMING */}
        {activeTab === "upcoming" && upcomingList.map((instance) => (
          <NotificationListItem
            key={`up-${instance._id}`}
            instance={instance}
            tabType="upcoming"
          />
        ))}

        {/* PENALTY WAIVERS (Action Required) */}
        {activeTab === "action_required" && waiversList.map((instance) => (
          <NotificationListItem
            key={`act-${instance._id}`}
            instance={instance}
            tabType="action_required"
          />
        ))}

        {/* VERIFIED */}
        {activeTab === "verified" && verifiedList.map((instance) => (
          <NotificationListItem
            key={`ver-${instance._id}`}
            instance={instance}
            tabType="verified"
          />
        ))}
          
      </UScroll>
    </UView>
  );
}
