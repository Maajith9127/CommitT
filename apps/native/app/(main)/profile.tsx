import React from "react";
import { ScrollView, View, RefreshControl, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { authClient } from "@/lib/auth-client";
import { HeaderTitle, FooterText, PrimaryButton } from "@/components/ui";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { usePermissions } from "@/hooks/usePermissions";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

/**
 * ProfileScreen: The Central Command Center
 * -----------------------------------------------------------------------------
 * Displays user identity and critical system health metrics, specifically
 * focusing on Permission Manifest integrity and session management.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { permissions, isLoading, refresh } = usePermissions();

  // DASHBOARD COLOR SYSTEM (Steel Vault Standard)
  const getStatusColor = (granted: boolean) => (granted ? "#4CD964" : "#FF3B30");
  const getSubtitle = (granted: boolean, text: string) => 
    granted ? "Permission active and secured" : text;

  /**
   * handleSignOut: The Terminal Handoff
   * ---------------------------------------------------------------------------
   * Securely terminates both the app session and the Google SSO hardware token.
   * This facilitates a clean identity switch (Gmail account rotation).
   */
  const handleSignOut = async () => {
    try {
      console.log("[Profile] Initiating Identity Logout...");
      await authClient.signOut();
      await GoogleSignin.signOut();
      
      // Redirect to the entry logic (Steel Gate)
      router.replace("/(auth)/signin");
      console.log("[Profile] Identity purged. Redirecting to auth gate.");
    } catch (error) {
      console.error("[Profile] Logout failure:", error);
    }
  };

  return (
    <UScroll 
      className="flex-1 bg-black"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor="#4FA0FF" />
      }
    >
      {/* ── USER IDENTITY BLOCK ── */}
      <UView className="items-center mb-10">
        <UView className="w-24 h-24 rounded-full bg-[#1A1A1A] items-center justify-center border-2 border-[#333]">
          <MaterialCommunityIcons name="account-outline" size={50} color="#4FA0FF" />
        </UView>
        <HeaderTitle className="mt-4 text-3xl">System Manifest</HeaderTitle>
        <FooterText className="mt-2 text-gray-400 text-center">
          Monitoring hardware status and security permissions
        </FooterText>
      </UView>

      {/* ── PERMISSION GRID (REACTIVE) ── */}
      <UView>
        <HeaderTitle className="text-xl mb-4 text-[#4FA0FF]">Core Requirements</HeaderTitle>
        
        <ConditionCard
          icon="map-marker-radius"
          title="Location Engine"
          subtitle={getSubtitle(permissions.location, "Needed for GPS verification gates")}
          iconColor={getStatusColor(permissions.location)}
          titleColor={getStatusColor(permissions.location)}
          className="bg-[#1A1A1A] border border-white/5"
        />

        <ConditionCard
          icon="camera-outline"
          title="Telemetry Capture"
          subtitle={getSubtitle(permissions.camera, "Required for photo evidence")}
          iconColor={getStatusColor(permissions.camera)}
          titleColor={getStatusColor(permissions.camera)}
          className="bg-[#1A1A1A] border border-white/5"
        />

        <ConditionCard
          icon="bell-badge-outline"
          title="Notification Heartbeat"
          subtitle={getSubtitle(permissions.notifications, "For real-time check-in alerts")}
          iconColor={getStatusColor(permissions.notifications)}
          titleColor={getStatusColor(permissions.notifications)}
          className="bg-[#1A1A1A] border border-white/5"
        />

        <ConditionCard
          icon="alarm"
          title="System Scheduler"
          subtitle={getSubtitle(permissions.alarms, "Allows app to wake device for tasks")}
          iconColor={getStatusColor(permissions.alarms)}
          titleColor={getStatusColor(permissions.alarms)}
          className="bg-[#1A1A1A] border border-white/5"
        />

        <HeaderTitle className="text-xl mt-6 mb-4 text-[#A855F7]">Advanced Anti-Cheat</HeaderTitle>

        <ConditionCard
          icon="battery-alert-outline"
          title="Battery Preservation"
          subtitle={getSubtitle(permissions.battery, "Disable optimization for logic stability")}
          iconColor={getStatusColor(permissions.battery)}
          titleColor={getStatusColor(permissions.battery)}
          className="bg-[#1A1A1A] border border-white/5"
        />

        <ConditionCard
          icon="dock-window"
          title="System Overlay"
          subtitle={getSubtitle(permissions.overlay, "Required for strict mode lockout")}
          iconColor={getStatusColor(permissions.overlay)}
          titleColor={getStatusColor(permissions.overlay)}
          className="bg-[#1A1A1A] border border-white/5"
        />

        <ConditionCard
          icon="account-key-outline"
          title="Accessibility Gate"
          subtitle={getSubtitle(permissions.accessibility, "Needed for deep app blocking")}
          iconColor={getStatusColor(permissions.accessibility)}
          titleColor={getStatusColor(permissions.accessibility)}
          className="bg-[#1A1A1A] border border-white/5"
        />
      </UView>

      {/* ── TERMINAL LOGOUT CONDUIT ── */}
      <UView className="mt-10 border-t border-[#333] pt-10">
        <PrimaryButton 
          className="bg-[#FF3B30]" 
          onPress={handleSignOut}
        >
          Logout Session
        </PrimaryButton>
        <FooterText className="mt-4 text-center text-gray-500">
          Identity rotation requires re-authentication via Gmail
        </FooterText>
      </UView>

      <FooterText className="mt-8 text-center text-gray-600 italic">
        Manifest Version: 1.0.4-Surgical
      </FooterText>
    </UScroll>
  );
}
