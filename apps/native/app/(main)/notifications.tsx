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

/**
 * TaskInstance representation for the notifications feed.
 * 
 * @remarks
 * `_live_schedule_time` is a temporary dogfooding metric injected directly 
 * from the Convex systems table. In production, expiry parameters will be 
 * derived from `end` and `penalty_waiver.deadline_minutes` persisted to
 * the instance natively.
 */
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
  _live_schedule_time?: number;
}

/**
 * Reusable layout row for presenting structured context metrics visually.
 * Applies conditional mapping for formatting active expiration windows.
 * 
 * @remarks
 * Temporary Dogfooding Implementation:
 * Displays the exact cron execution timestamp as the penalty expiration deadline.
 * This is extracted directly from the system queue by the backend.
 * 
 * Production Migration Path:
 * Compute this from `instance.end + deadline_minutes` instead of relying 
 * on the injected `_live_schedule_time` field.
 */
function NotificationListItem({ instance, tabType }: { instance: TaskInstance, tabType: Tab }) {
  const iconName = tabType === "upcoming" ? "clock-outline" : tabType === "action_required" ? "alert-decagram-outline" : "check-decagram-outline";
  const formattedTime = dayjs(instance.start).format("MMM D, h:mm A");
  
  const locationCondition = instance.conditions?.find((c: any) => c.metric_key === "location");
  const locName = locationCondition?.target?.value?.address?.split(",")[0];
  
  return (
    <UPress className="active:opacity-70">
      <UView className="flex-row items-start py-4 border-b border-[#2A2A2A] px-4">
        
        <UView className="w-[44px] items-end mr-3">
          <MaterialCommunityIcons name={iconName} size={32} color="white" />
        </UView>

        <UView className="flex-1">
          {tabType === "upcoming" ? (
            <UView className="flex-col">
              <BodyText className="text-gray-300 text-[15px] leading-5">
                <BodyText className="font-bold text-white">{instance.title}</BodyText> {instance.description ? `— ${instance.description}` : ""}
                {locName ? ` at ${locName}` : ""}
              </BodyText>
              
              {instance._live_schedule_time && (
                <BodyText className="text-[#4FA0FF] font-bold mt-1 text-[13px]">
                  Ends At: {dayjs(instance._live_schedule_time).format("MMM D, h:mm A")}
                </BodyText>
              )}
            </UView>
          ) : tabType === "action_required" ? (
            <UView className="flex-col">
              <BodyText className="text-gray-300 text-[15px] leading-5">
                <BodyText className="font-bold text-white">{instance.title}</BodyText> requires a waiver.
                {instance.penalty_waiver?.type === "captcha" 
                    ? ` Solve ${instance.penalty_waiver.config?.count || 'the'} CAPTCHAs to avoid the ` 
                    : ` Complete your challenge to avoid the `}
                {String(instance.penalty?.type || "penalty").replace('_', ' ')} consequence.
              </BodyText>

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

/**
 * Primary root boundary for the notifications navigation path.
 * Retains continuous layout state via React hooks and Convex WebSockets.
 * 
 * @remarks
 * Subscribes to `api.notifications.read.getGroups` which currently scrapes 
 * Convex's internal `_scheduled_functions` queue. The subscription is reactive,
 * auto-executing whenever background systems change. The frontend requires 
 * zero changes during the production migration phase.
 */
export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");

  const data = useQuery(api.api.notifications.read.getGroups, { limit: 50 });

  // Safe fallback bindings to prevent mapping crashes during initial load
  const upcomingList = (data?.upcoming || []) as any[];
  const waiversList = (data?.action_required || []) as any[];
  const verifiedList = (data?.verified || []) as any[];

  return (
    <UView className="flex-1 bg-black pt-2">
      <UView className="px-4">
        <TabsBar tabs={TABS} activeTab={activeTab} onChange={(key) => setActiveTab(key as Tab)} />
      </UView>

      {/* Suspend the list feed during WebSocket connection initialization */}
      {data === undefined ? (
        <UView className="flex-1 items-center justify-center mt-2">
          <ActivityIndicator size="small" color="#4FA0FF" />
        </UView>
      ) : (
        <UScroll className="flex-1 mt-2" showsVerticalScrollIndicator={false}>
          
          {activeTab === "upcoming" && upcomingList.map((instance) => (
            <NotificationListItem
              key={`up-${instance._id}`}
              instance={instance}
              tabType="upcoming"
            />
          ))}

          {activeTab === "action_required" && waiversList.map((instance) => (
            <NotificationListItem
              key={`act-${instance._id}`}
              instance={instance}
              tabType="action_required"
            />
          ))}

          {activeTab === "verified" && verifiedList.map((instance) => (
            <NotificationListItem
              key={`ver-${instance._id}`}
              instance={instance}
              tabType="verified"
            />
          ))}
            
        </UScroll>
      )}
    </UView>
  );
}
