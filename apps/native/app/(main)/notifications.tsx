import { useState, useRef } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, useWindowDimensions } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { withUniwind } from "uniwind";
import { TabsBar } from "@/components/ui/blocklist";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BodyText, FooterText, HeaderTitle } from "@/components/ui/text";
import dayjs from "dayjs";
import { THEME } from "@/constants/theme";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UPress = withUniwind(Pressable);

type Tab = "upcoming" | "action_required" | "verified";

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "action_required", label: "Waiver" },
  { key: "verified", label: "History" },
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
function NotificationListItem({ instance, tabType }: { instance: any, tabType: Tab }) {
  let iconName = "clock-outline";
  let iconColor = THEME.colors.textMain;

  if (tabType === "upcoming") {
    iconName = "clock-outline";
    iconColor = THEME.colors.textMain;
  } else if (tabType === "action_required") {
    iconName = "alert-decagram-outline";
    iconColor = THEME.colors.textMain;
  } else if (tabType === "verified") {
    if (instance.event_type === "penalty_executed" || instance.event_type === "penalty_failed") {
      iconName = "close-circle-outline";
      iconColor = THEME.colors.danger;
    } else if (instance.event_type === "instance_scheduled") {
      iconName = "calendar-sync-outline";
      iconColor = THEME.colors.primary;
    } else if (instance.event_type === "penalty_armed" || instance.event_type === "waiver_activated") {
      iconName = "alert-rhombus-outline";
      iconColor = THEME.colors.primary;
    } else {
      iconName = "check-decagram-outline";
      iconColor = THEME.colors.success;
    }
  }

  const formattedTime = dayjs(instance.start || instance.created_at).format("MMM D, h:mm A");
  
  const locationCondition = instance.conditions?.find((c: any) => c.metric_key === "location");
  const locName = locationCondition?.target?.value?.address?.split(",")[0];
  
  return (
    <UPress className="active:opacity-70">
      <UView className="flex-row items-start py-4 border-b px-4" style={{ borderBottomColor: THEME.colors.surfaceElevated }}>
        
        <UView className="w-[44px] items-end mr-3 mt-1">
          <MaterialCommunityIcons name={iconName as any} size={30} color={iconColor} />
        </UView>

        <UView className="flex-1">
          {tabType === "upcoming" ? (
            <UView className="flex-col">
              <BodyText style={{ color: THEME.colors.textMuted, fontSize: 15, lineHeight: 20 }}>
                <BodyText className="font-bold" style={{ color: THEME.colors.textMain }}>{instance.title}</BodyText> {instance.description ? `— ${instance.description}` : ""}
                {locName ? ` at ${locName}` : ""}
              </BodyText>
              
              {instance._live_schedule_time && (
                <BodyText className="font-bold mt-1" style={{ color: THEME.colors.primary, fontSize: 13 }}>
                  Ends At: {dayjs(instance._live_schedule_time).format("MMM D, h:mm A")}
                </BodyText>
              )}
            </UView>
          ) : tabType === "action_required" ? (
            <UView className="flex-col">
              <BodyText style={{ color: THEME.colors.textMuted, fontSize: 15, lineHeight: 20 }}>
                <BodyText className="font-bold" style={{ color: THEME.colors.textMain }}>{instance.title}</BodyText> requires a waiver.
                {instance.penalty_waiver?.type === "captcha" 
                    ? ` Solve ${instance.penalty_waiver.config?.count || 'the'} CAPTCHAs to avoid the ` 
                    : ` Complete your challenge to avoid the `}
                {String(instance.penalty?.type || "penalty").replace('_', ' ')} consequence.
              </BodyText>

              {instance._live_schedule_time && (
                <BodyText className="font-bold mt-1" style={{ color: THEME.colors.danger, fontSize: 13 }}>
                  Expires At: {dayjs(instance._live_schedule_time).format("MMM D, h:mm A")}
                </BodyText>
              )}
            </UView>
          ) : (
            <UView className="flex-col">
              {instance.event_type === "instance_scheduled" ? (
                <BodyText style={{ color: THEME.colors.textMuted, fontSize: 15, lineHeight: 20 }}>
                  <BodyText className="font-bold" style={{ color: THEME.colors.textMain }}>Temporal Sync</BodyText> — Scheduled for {instance.metadata?.scheduled_for ? dayjs(instance.metadata.scheduled_for).format('D MMM YYYY, h:mm A') : "upcoming window."}
                </BodyText>
              ) : (
                <BodyText style={{ color: THEME.colors.textMuted, fontSize: 15, lineHeight: 20 }}>
                  {instance.message}
                </BodyText>
              )}
              <BodyText className="font-bold mt-1" style={{ color: iconColor, fontSize: 13 }}>
                {dayjs(instance.created_at || instance._creationTime).format("MMM D, h:mm A")}
              </BodyText>
            </UView>
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
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const horizontalScrollRef = useRef<ScrollView>(null);

  const data = useQuery(api.api.notifications.read.getGroups, { limit: 50 });

  // Safe fallback bindings to prevent mapping crashes during initial load
  const upcomingList = (data?.upcoming || []) as any[];
  const waiversList = (data?.action_required || []) as any[];
  const verifiedList = (data?.verified || []) as any[];

  const handleTabChange = (key: Tab) => {
    const index = TABS.map(t => t.key).indexOf(key);
    if (index !== -1) {
      horizontalScrollRef.current?.scrollTo({
        x: index * SCREEN_WIDTH,
        animated: true
      });
      setActiveTab(key);
    }
  };

  const handleMomentumScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    const newTab = TABS[index]?.key;
    if (newTab && newTab !== activeTab) {
      setActiveTab(newTab as Tab);
    }
  };

  return (
    <UView className="flex-1 pt-2" style={{ backgroundColor: THEME.colors.pureBlack }}>
      <UView className="px-4">
        <TabsBar tabs={TABS} activeTab={activeTab} onChange={(key) => handleTabChange(key as Tab)} />
      </UView>

      {/* Suspend the list feed during WebSocket connection initialization */}
      {data === undefined ? (
        <UView className="flex-1 items-center justify-center mt-2">
          <ActivityIndicator size="small" color={THEME.colors.primary} />
        </UView>
      ) : (
        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          style={{ flex: 1, marginTop: 8 }}
        >
          {/* TAB 1: Upcoming */}
          <UScroll style={{ width: SCREEN_WIDTH }} showsVerticalScrollIndicator={false}>
            {upcomingList.map((instance) => (
              <NotificationListItem key={`up-${instance._id}`} instance={instance} tabType="upcoming" />
            ))}
            {upcomingList.length === 0 && (
              <UView className="py-20 items-center justify-center px-8">
                 <MaterialCommunityIcons name="clock-check-outline" size={48} color={THEME.colors.textMuted} />
                 <HeaderTitle className="mt-4 text-center text-lg" style={{ color: THEME.colors.textMuted }}>No upcoming commitments right now.</HeaderTitle>
              </UView>
            )}
            <UView className="pb-10" />
          </UScroll>

          {/* TAB 2: Action Required */}
          <UScroll style={{ width: SCREEN_WIDTH }} showsVerticalScrollIndicator={false}>
            {waiversList.map((instance) => (
              <NotificationListItem key={`act-${instance._id}`} instance={instance} tabType="action_required" />
            ))}
            {waiversList.length === 0 && (
              <UView className="py-20 items-center justify-center px-8">
                 <MaterialCommunityIcons name="shield-check-outline" size={48} color={THEME.colors.textMuted} />
                 <HeaderTitle className="mt-4 text-center text-lg" style={{ color: THEME.colors.textMuted }}>You are all caught up! No waivers require attention.</HeaderTitle>
              </UView>
            )}
            <UView className="pb-10" />
          </UScroll>

          {/* TAB 3: History */}
          <UScroll style={{ width: SCREEN_WIDTH }} showsVerticalScrollIndicator={false}>
            {verifiedList.map((instance) => (
              <NotificationListItem key={`ver-${instance._id}`} instance={instance} tabType="verified" />
            ))}
            {verifiedList.length === 0 && (
              <UView className="py-20 items-center justify-center px-8">
                 <MaterialCommunityIcons name="history" size={48} color={THEME.colors.textMuted} />
                 <HeaderTitle className="mt-4 text-center text-lg" style={{ color: THEME.colors.textMuted }}>Your chronological history will appear here.</HeaderTitle>
              </UView>
            )}
            <UView className="pb-10" />
          </UScroll>
        </ScrollView>
      )}
    </UView>
  );
}
