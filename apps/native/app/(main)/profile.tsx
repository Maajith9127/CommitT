import React, { useMemo } from "react";
import { ScrollView, View, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";

import { authClient } from "@/lib/auth-client";

// Typography imports
import { AuthHeading, FooterText, HeaderTitle } from "@/components/ui/text";
// The 'select option' UI used in final.tsx
import { SettingsToggleCard } from "@/components/ui/commits/SettingsToggleCard";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

export default function ProfileScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  // ─────────────────────────────────────────────────────────────────────────
  // Menu Item Configurations
  // Using the exact 'select' pattern from final.tsx for navigation options
  // ─────────────────────────────────────────────────────────────────────────
  const accountItems = useMemo(() => [
    {
      id: "account",
      title: "Account",
      type: "select" as const,
      icon: "account-outline",
      onPress: () => console.log('Navigate to Account'),
    },
    {
      id: "premium",
      title: "Premium",
      type: "select" as const,
      icon: "diamond-stone",
      onPress: () => console.log('Navigate to Premium'),
    },
    {
      id: "backup",
      title: "Backup",
      type: "select" as const,
      icon: "cloud-outline",
      onPress: () => console.log('Navigate to Backup'),
    },
    {
      id: "permissions",
      title: "Permissions",
      type: "select" as const,
      icon: "shield-check-outline",
      onPress: () => router.push("/(settings)/permissions" as any),
    },
    {
      id: "privacy",
      title: "Privacy & Security",
      type: "select" as const,
      icon: "lock-outline",
      onPress: () => console.log('Navigate to Privacy'),
    },
  ], [router]);

  const customizeItems = useMemo(() => [
    {
      id: "general",
      title: "General",
      type: "select" as const,
      icon: "cog-outline",
      onPress: () => console.log('Navigate to General'),
    },
    {
      id: "appearance",
      title: "Appearance",
      type: "select" as const,
      icon: "palette-outline",
      onPress: () => console.log('Navigate to Appearance'),
    },
    {
      id: "blockScreen",
      title: "Block Screen",
      type: "select" as const,
      icon: "cellphone",
      onPress: () => console.log('Navigate to Block Screen'),
    },
    {
      id: "notifications",
      title: "Notifications",
      type: "select" as const,
      icon: "bell-outline",
      onPress: () => console.log('Navigate to Notifications'),
    },
  ], []);

  return (
    <UScroll 
      className="flex-1 bg-black"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 30, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── USER IDENTITY OVERVIEW ── */}
      <UView className="items-center mb-10 mt-2">
        <UView className="w-28 h-28 rounded-full bg-[#1A1A1A] items-center justify-center border-2 border-[#333] overflow-hidden mb-4">
          {user?.image ? (
            <Image source={{ uri: user.image }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <MaterialCommunityIcons name="account" size={70} color="#A855F7" />
          )}
        </UView>
        <AuthHeading className="text-4xl font-bold mb-1 text-white">
          {user?.name || "Member"}
        </AuthHeading>
        <FooterText className="text-gray-400 text-sm">
          {user?.email || "Member since November 2025"}
        </FooterText>
      </UView>

      {/* ── ACCOUNT SECTION ── */}
      <UView className="mb-4">
        <HeaderTitle className="mb-4 text-2xl font-bold text-white">Account</HeaderTitle>
      </UView>
      <SettingsToggleCard
        className="mb-8"
        // @ts-ignore - Ignoring strict type checking in case the component signature has a slightly different property set for select items
        items={accountItems}
      />

      {/* ── CUSTOMIZE SECTION ── */}
      <UView className="mb-4">
        <HeaderTitle className="mb-4 text-2xl font-bold text-white">Customize</HeaderTitle>
      </UView>
      <SettingsToggleCard
        className="mb-8"
        // @ts-ignore
        items={customizeItems}
      />

    </UScroll>
  );
}
