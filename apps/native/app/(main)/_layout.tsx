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
import { useState } from "react";

const UView = withUniwind(View);
const UText = withUniwind(Text);
const UPressable = withUniwind(Pressable);

import dayjs from "dayjs";

export default function MainLayout() {
  const pathname = usePathname();
  const router = useRouter();

  // ─────────────────────────────────────────────────────────────────────────
  // Auth & Store for "Add" Action (Global)
  // ─────────────────────────────────────────────────────────────────────────
  const { data: session } = authClient.useSession();
  const setAssigner = useTaskDraftStore((state) => state.setAssigner);
  const setAssignee = useTaskDraftStore((state) => state.setAssignee);
  const resetDraft = useTaskDraftStore((state) => state.resetDraft);

  // Calendar Store for Verify Page
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  const setSelectedDate = useCalendarStore((state) => state.setSelectedDate);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  /**
   * Navigate to create new commitment screen.
   */
  const handleCreateNew = () => {
    if (!session?.user?.id) return;

    resetDraft();
    setAssigner(session.user.id);
    setAssignee(session.user.id);
    router.push("/(create-commit)/final");
  };

  // Determine header based on route
  const getHeaderConfig = () => {
    // Consistent Icon across all pages
    const icon = "rotate-orbit" as const;

    if (pathname.includes("/verify")) {
      return { title: "Verify", icon }; // Title ignored in render for Verify
    }
    if (pathname.includes("/schedules")) {
      return { 
        title: dayjs().format("MMMM D, YYYY"), 
        icon,
        rightAction: (
            <UPressable 
                onPress={() => setSelectedDate(dayjs().toISOString())}
            >
                <MaterialCommunityIcons name="calendar-today" size={34} color="white" />
            </UPressable>
        )
      };
    }
    if (pathname.includes("/calendar")) {
      return { title: "Calendar", icon };
    }
    if (pathname.includes("/strict")) {
      return { title: "Strict Mode", icon };
    }
    if (pathname.includes("/insights")) {
      return { title: "Insights", icon };
    }
    if (pathname.includes("/profile")) {
      return { title: "Profile", icon };
    }
    
    // Default (Commits) - explicit check or fallback
    return { 
      title: "CommitTs", 
      icon,
    };
  };

  const { title, icon, rightAction } = getHeaderConfig();
  const isSchedules = pathname.includes("/schedules");

  return (
    <UView className="flex-1 bg-black">
      {/* TOP NAVBAR - Sticky/Shared across all (main) screens */}
      {!pathname.includes("/calendar") && (
        <UView className="w-full flex-row items-center justify-between bg-black pt-14 pb-4 px-4">
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
           
           <UView className="flex-row items-center gap-4">
              {/* Dynamic Right Action (e.g. Add Button) */}
              {rightAction && <View>{rightAction}</View>}
              
              {/* Notification/Settings Placeholder */}
              {!rightAction && (
                <MaterialCommunityIcons name="bell-outline" size={24} color="#333" />
              )}
           </UView>
        </UView>
      )}

      {/* MAIN SCREEN CONTENT */}
      <UView className="flex-1 bg-black">
        <Tabs
          tabBar={(props) => <BottomTabBar {...props} />}
          screenOptions={{
            headerShown: false, // We use our own custom header above
            tabBarStyle: {
              backgroundColor: "#000000",
              borderTopWidth: 0,
            },
          }}
          sceneContainerStyle={{
            backgroundColor: "#000000",
          }}
        >
            <Tabs.Screen name="commits" />
            <Tabs.Screen name="schedules" />
            <Tabs.Screen name="strict" />
            <Tabs.Screen name="insights" />
            <Tabs.Screen name="profile" />
            
            {/* Exclude other routes from the tab bar if they happen to be in (main) group but not tabs */}
            <Tabs.Screen name="verify" options={{ href: null }} />
            <Tabs.Screen name="calendar" options={{ href: null }} />
        </Tabs>
      </UView>

      <DatePickerModal 
        isVisible={isDatePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        date={selectedDate}
        onDateChange={(date) => {
            setSelectedDate(date);
            setDatePickerVisible(false); // Auto close
        }}
      />
    </UView>
  );
}
