import { Tabs, usePathname, useRouter } from "expo-router";
import { Text, View, Pressable, Image } from "react-native";
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


import { useUpcomingVerification } from "@/hooks/commits/useUpcomingVerification";
import { useState } from "react";
import dayjs from "dayjs";

const UView = withUniwind(View);
const UText = withUniwind(Text);
const UPressable = withUniwind(Pressable);
const UImage = withUniwind(Image);

// Standardized visual dimensions for header actions
const HEADER_ICON_SIZE = 32;

/**
 * MainLayout — Root Component for the Authenticated App (`/app/(main)`)
 * 
 * ARCHITECTURE OVERVIEW:
 * This layout manages three primary responsibilities:
 * 
 * 1. Global Navigation (Tabs & Headers):
 *    - Renders `BottomTabBar` for switching between Commits, Schedules, Insights, etc.
 *    - Renders a unified sticky top header that adapts to the current route.
 * 
 * 2. Global Singleton Modals:
 *    - `<EventDetailModal />` — Self-contained, reads state from Zustand. Protected by a
 *      module-level singleton guard to prevent Expo Router from creating duplicate instances
 *      during Stack transitions. See EventDetailModal.tsx for full documentation.
 *    - `<DatePickerModal />` — Date selection overlay for the Schedules screen.
 * 
 * 3. Draft State Management:
 *    - Prepares `useTaskDraftStore` when the user taps "Add" to create a new task.
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
        title: dayjs(selectedDate).format("MMMM"), 
        icon: "menu", // Hamburger menu style
        rightAction: (
            <UView className="flex-row items-center gap-4">
                <UPressable>
                    <MaterialCommunityIcons name="magnify" size={HEADER_ICON_SIZE} color="white" />
                </UPressable>
                <UPressable 
                    onPress={() => setSelectedDate(dayjs().toISOString())}
                    className="items-center justify-center"
                >
                    <MaterialCommunityIcons name="calendar-today" size={HEADER_ICON_SIZE} color="white" />
                </UPressable>
                {/* User Avatar - Proportional to header icons */}
                <UView className="w-8 h-8 rounded-full bg-[#1e1e1e] items-center justify-center border-2 border-white overflow-hidden ml-1">
                    {session?.user?.image ? (
                        <Image 
                            source={{ uri: session.user.image }} 
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    ) : (
                        <UText className="text-[10px] text-white font-bold">
                            {session?.user?.name?.charAt(0) || "U"}
                        </UText>
                    )}
                </UView>
            </UView>
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
           <UView className="flex-row items-center gap-3">
              <MaterialCommunityIcons name={icon as any} size={HEADER_ICON_SIZE} color="white" />
              
              {isSchedules ? (
                  <UPressable 
                    onPress={() => setDatePickerVisible(true)}
                    className="flex-row items-center gap-1"
                  >
                        <HeaderTitle className="text-2xl text-white">
                            {title}
                        </HeaderTitle> 
                        <MaterialCommunityIcons name="chevron-down" size={20} color="white" />
                  </UPressable>
              ) : (
                  <HeaderTitle className="text-2xl text-white">{title}</HeaderTitle>
              )}
           </UView>
           
           {/* Header Right: Actions (e.g., Calendar Icon, Notifications) */}
           <UView className="flex-row items-center gap-4">
              {rightAction && <View>{rightAction}</View>}
              {!rightAction && (
                <UPressable onPress={() => router.push("/(notifications)")}>
                  <MaterialCommunityIcons name="bell-outline" size={24} color="#333" />
                </UPressable>
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

      {/* ── GLOBAL SINGLETON MODALS ──────────────────────────────────────── */}
      {/* 
       * These modals live here (layout level) so any tab can trigger them
       * via Zustand without re-rendering individual screen components.
       * EventDetailModal uses a singleton guard (see its source for details).
       */}
      <DatePickerModal 
        isVisible={isDatePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        date={selectedDate}
        onDateChange={(date) => {
            setSelectedDate(date);
            setDatePickerVisible(false);
        }}
      />

      {/* Self-contained: reads selectedEventId + selectedEvent from Zustand */}
      <EventDetailModal />
      
    </UView>
  );
}
