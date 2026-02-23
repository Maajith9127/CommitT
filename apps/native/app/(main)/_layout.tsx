import { Tabs, usePathname, useRouter } from "expo-router";
import { Text, View, Pressable } from "react-native";
import { withUniwind } from "uniwind";
import { BottomTabBar } from "@/components/ui/index";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeaderTitle } from "@/components/ui/text";
import { AddButton, SecondaryButton } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { DatePickerModal } from "@/components/ui/modal/DatePickerModal";
import { EventDetailModal } from "@/components/ui/modal/EventDetailModal";
import { useCalendarEvents } from "@/hooks/calendar/useCalendarEvents";
import { useUpcomingVerification } from "@/hooks/commits/useUpcomingVerification";
import { useState } from "react";
import dayjs from "dayjs";

const UView = withUniwind(View);
const UText = withUniwind(Text);
const UPressable = withUniwind(Pressable);

/**
 * MainLayout - The Root Component for the Authenticated App (`/app/(main)`)
 * 
 * ARCHITECTURE OVERVIEW:
 * This layout serves as the core foundation for all main application screens.
 * It manages three primary responsibilities to ensure smooth 60fps performance:
 * 
 * 1. Global Navigation (Tabs & Headers):
 *    - Renders the `BottomTabBar` for switching between Commits, Schedules, Insights, etc.
 *    - Renders a unified sticky top header that dynamically changes context based on the current route.
 * 
 * 2. Global State Hoisting (The "Singleton" Modal Pattern):
 *    - By declaring `<EventDetailModal />` and `<DatePickerModal />` at this root level, 
 *      we avoid mounting identical modals multiple times across different tabs.
 *    - If modals were placed inside each tab, React Navigation would keep them all alive in memory,
 *      causing double-rendering overlays, massive UI lag, and deep Android View Hierarchy conflicts.
 *      Here, they exist only once and are triggered via Zustand Global State.
 * 
 * 3. Draft State Management:
 *    - Prepares the global `useTaskDraftStore` when the user initiates a new task via the "Add" button.
 */
export default function MainLayout() {
  const pathname = usePathname();
  const router = useRouter();

  // ─────────────────────────────────────────────────────────────────────────
  // 1. ZUSTAND GLOBAL STORES
  // ─────────────────────────────────────────────────────────────────────────
  
  // Auth Store
  const { data: session } = authClient.useSession();
  
  // Task Draft Store: Used when creating a new "CommitT" from the header Add button
  const setAssigner = useTaskDraftStore((state) => state.setAssigner);
  const setAssignee = useTaskDraftStore((state) => state.setAssignee);
  const resetDraft = useTaskDraftStore((state) => state.resetDraft);

  // Calendar Store: Used to globally trigger the DatePicker and EventDetail Modals seamlessly
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  const setSelectedDate = useCalendarStore((state) => state.setSelectedDate);
  const selectedEventId = useCalendarStore((state) => state.selectedEventId);
  const setSelectedEventId = useCalendarStore((state) => state.setSelectedEventId);

  // 🪄 Headless Synchronizer: Keeps the global `events` list in Zustand in sync with Convex
  useCalendarEvents();
  
  // 🪄 Headless Synchronizer: Keeps track of the NEXT Verification instance for the Commits screen
  useUpcomingVerification();
  
  // Local State: Controls the Date Picker UI visibility
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. ACTION HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * handleCreateNew
   * Resets any stale draft data and initializes a new task with the current user
   * as both the assigner and assignee, then routes to the creation flow.
   */
  const handleCreateNew = () => {
    if (!session?.user?.id) return;

    resetDraft();
    setAssigner(session.user.id);
    setAssignee(session.user.id);
    router.push("/(create-commit)/final");
  };

  /**
   * getHeaderConfig
   * A pure function that analyzes the current `pathname` and returns the specific
   * UI configuration (Title, Icon, Right-side Actions) for the sticky top-bar.
   */
  const getHeaderConfig = () => {
    const icon = "rotate-orbit" as const; // Default brand icon

    if (pathname.includes("/verify")) {
      return { title: "Verify", icon }; 
    }
    
    // The Schedules screen gets a special interactive header (Date Picker trigger)
    if (pathname.includes("/schedules")) {
      return { 
        title: dayjs().format("MMMM D, YYYY"), 
        icon,
        rightAction: (
            <UPressable onPress={() => setSelectedDate(dayjs().toISOString())}>
                <MaterialCommunityIcons name="calendar-today" size={34} color="white" />
            </UPressable>
        )
      };
    }
    
    if (pathname.includes("/calendar")) return { title: "Calendar", icon };
    if (pathname.includes("/strict")) return { title: "Strict Mode", icon };
    if (pathname.includes("/insights")) return { title: "Insights", icon };
    if (pathname.includes("/profile")) return { title: "Profile", icon };
    
    // Fallback default is the main Commits screen
    return { title: "CommitTs", icon };
  };

  const { title, icon, rightAction } = getHeaderConfig();
  const isSchedules = pathname.includes("/schedules");

  // ─────────────────────────────────────────────────────────────────────────
  // 3. RENDER TREE
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <UView className="flex-1 bg-black">
      
      {/* --- GLOBAL STICKY HEADER --- */}
      {/* We hide this header if we are inside the pure '/calendar' mode */}
      {!pathname.includes("/calendar") && (
        <UView className="w-full flex-row items-center justify-between bg-black pt-14 pb-4 px-4">
           
           {/* Header Left: Icon & Dynamic Title */}
           <UView className="flex-row items-center gap-2">
              <MaterialCommunityIcons name={icon} size={30} color="white" />
              
              {isSchedules ? (
                  <UPressable onPress={() => setDatePickerVisible(true)}>
                        <HeaderTitle className="text-2xl text-white font-bold">
                            {dayjs(selectedDate).format("MMMM D, YYYY")}
                        </HeaderTitle> 
                  </UPressable>
              ) : (
                  <HeaderTitle className="text-2xl text-white">{title}</HeaderTitle>
              )}
           </UView>
           
           {/* Header Right: Actions (e.g., Calendar Icon, Notifications) */}
           <UView className="flex-row items-center gap-4">
              {rightAction && <View>{rightAction}</View>}
              {!rightAction && (
                <MaterialCommunityIcons name="bell-outline" size={24} color="#333" />
              )}
           </UView>
        </UView>
      )}

      {/* --- TAB NAVIGATOR --- */}
      <UView className="flex-1 bg-black">
        <Tabs
          tabBar={(props) => <BottomTabBar {...props} />}
          screenOptions={{
            headerShown: false, // Disabling Expo's default header since we use our custom sticky header above
            tabBarStyle: {
              backgroundColor: "#000000",
              borderTopWidth: 0,
            },
          }}
          sceneContainerStyle={{ backgroundColor: "#000000" }}
        >
            <Tabs.Screen name="commits" />
            <Tabs.Screen name="schedules" />
            <Tabs.Screen name="strict" />
            <Tabs.Screen name="insights" />
            <Tabs.Screen name="profile" />
            
            {/* These routes are grouped logically here but hidden from the bottom tab bar */}
            <Tabs.Screen name="verify" options={{ href: null }} />
            <Tabs.Screen name="calendar" options={{ href: null }} />
        </Tabs>
      </UView>

      {/* --- GLOBAL SINGLETON MODALS --- */}
      {/* 
        By placing these here, any tab can open them via Zustand instantly, 
        without causing its parent component to re-render. 
      */}
      <DatePickerModal 
        isVisible={isDatePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        date={selectedDate}
        onDateChange={(date) => {
            setSelectedDate(date);
            setDatePickerVisible(false); // Auto close upon selection
        }}
      />

      <EventDetailModal 
        visible={!!selectedEventId} 
        eventId={selectedEventId} 
        onClose={() => setSelectedEventId(null)} 
      />
      
    </UView>
  );
}
