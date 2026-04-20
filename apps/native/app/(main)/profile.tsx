import React, { useMemo, useState } from "react";
import { ScrollView, View, Image, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import { useConvex } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { useSQLiteContext } from "expo-sqlite";
import { clearSyncToken, ingestDeltaPayload } from "@/lib/sync-engine";
import { useHealStore } from "@/stores/useHealStore";
import { syncLock } from "@/lib/sync-lock";
import { scheduleNextAlarm } from "@/modules/scheduler-module";
import { nukeAndRebuildSchema } from "@/lib/local-db";

import { authClient } from "@/lib/auth-client";

// Typography imports
import { AuthHeading, FooterText, HeaderTitle } from "@/components/ui/text";
// The 'select option' UI used in final.tsx
import { SettingsToggleCard } from "@/components/ui/commits/SettingsToggleCard";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * STYLING UTILITIES
 * ─────────────────────────────────────────────────────────────────────────────
 */
const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * VIEW: ProfileScreen
 * ─────────────────────────────────────────────────────────────────────────────
 * User management hub providing access to account settings, customization,
 * and critical data synchronization operations.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  // ── DATA & STATE HOOKS ──
  const convex = useConvex();
  const db = useSQLiteContext();
  const { startHealing, stopHealing } = useHealStore();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [showResyncConfirm, setShowResyncConfirm] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncError, setResyncError] = useState<string | null>(null);

  /**
   * ─────────────────────────────────────────────────────────────────────────────
   * MENU CONFIGURATIONS
   * ─────────────────────────────────────────────────────────────────────────────
   */

  const accountItems = useMemo(() => [
    { id: "account", title: "Account", type: "select" as const, icon: "account-outline", onPress: () => console.log('Navigate to Account') },
    { id: "premium", title: "Premium", type: "select" as const, icon: "diamond-stone", onPress: () => console.log('Navigate to Premium') },
    { id: "backup", title: "Backup", type: "select" as const, icon: "cloud-outline", onPress: () => console.log('Navigate to Backup') },
    { id: "permissions", title: "Permissions", type: "select" as const, icon: "shield-check-outline", onPress: () => router.push("/(settings)/permissions" as any) },
    { id: "privacy", title: "Privacy & Security", type: "select" as const, icon: "lock-outline", onPress: () => console.log('Navigate to Privacy') },
  ], [router]);

  const customizeItems = useMemo(() => [
    { id: "general", title: "General", type: "select" as const, icon: "cog-outline", onPress: () => console.log('Navigate to General') },
    { id: "appearance", title: "Appearance", type: "select" as const, icon: "palette-outline", onPress: () => console.log('Navigate to Appearance') },
    { id: "blockScreen", title: "Block Screen", type: "select" as const, icon: "cellphone", onPress: () => console.log('Navigate to Block Screen') },
    { id: "notifications", title: "Notifications", type: "select" as const, icon: "bell-outline", onPress: () => console.log('Navigate to Notifications') },
  ], []);

  const sessionItems = useMemo(() => [
    { id: "full_resync", title: "Full Resync", type: "select" as const, icon: "cloud-sync-outline", onPress: () => setShowResyncConfirm(true) },
    { id: "help_support", title: "Help & Support", type: "select" as const, icon: "help-circle-outline", onPress: () => console.log('Help & Support') },
    { id: "switch_accounts", title: "Switch Accounts", type: "select" as const, icon: "account-switch-outline", onPress: () => console.log('Switch Accounts') },
    { id: "logout", title: "Log Out", type: "select" as const, icon: "logout", onPress: () => setShowLogoutConfirm(true) },
    { id: "delete_account", title: "Delete Account", type: "select" as const, icon: "delete-forever-outline", onPress: () => console.log('Delete Account') },
  ], []);

  /**
   * ─────────────────────────────────────────────────────────────────────────────
   * HANDLER: handleFullResync (The "Imperial Override")
   * ─────────────────────────────────────────────────────────────────────────────
   * PRODUCTION RATIONALE:
   * This is a 5-stage nuclear operation designed to recover from persistent 
   * local data corruption or to perform a clean-slate synchronization.
   *
   * 🛡️ SECURITY: 
   * We utilize a 'Fetch-Before-Wipe' protocol. This prevents 'offline amnesia' 
   * exploits where a user could turn off the internet, wipe local data, and 
   * bypass active blocks or rule enforcements. No data is touched until the 
   * cloud has proven it is ready to provide a replacement snapshot.
   *
   * 🏗️ DATABASE INTEGRITY:
   * During the wipe phase, we utilize structural drops rather than simple 
   * row deletions. This prevents 'NativeStatement' WAL (Write-Ahead Logging) 
   * corruption which can occur on budget Android devices if the WAL file 
   * grows too large during a bulk row delete.
   *
   * 🔄 ENGINE COORDINATION:
   * The 'isManualResyncActive' flag is a critical semaphore. It signals the 
   * background 'HydrationSync' engine to stand down, preventing it from 
   * detecting the empty database mid-wipe and entering a concurrent 
   * 'Loop of Doom' sync race.
   */
  const handleFullResync = async () => {
    setIsResyncing(true);
    setResyncError(null);
    
    try {
      // ── STAGE 0: PROVE CONNECTIVITY ──
      // verifying internet access BEFORE we wipe any local anti-cheat data.
      const probe = await fetch('https://google.com', { method: 'HEAD' }).catch(() => null);
      if (!probe || !probe.ok) {
        throw new Error("Active internet connection required for Full Resync.");
      }

      startHealing("Verifying cloud state and preparing resynchronization...");
      
      // Arm the semaphore to silence background sync triggers
      syncLock.isManualResyncActive = true;

      await syncLock.execute("Saga:ManualResync", async () => {
        // ── STAGE 1: ATOMIC CLOUD FETCH ──
        // Download entire snapshot to RAM before touching SQLite.
        // If this fails (network drop), the local "Block" state remains intact.
        const payload = await convex.query(api.api.sync.delta.getDeltaPayload, {});

        // ── STAGE 2: STRUCTURAL WIPE ──
        // Only safe to wipe now that we have the replacement data in memory.
        await nukeAndRebuildSchema(db);

        // ── STAGE 3: DATA REFLATION ──
        await clearSyncToken();
        await ingestDeltaPayload(db, payload);

        // ── STAGE 4: HARDWARE RESCHEDULING ──
        scheduleNextAlarm();
      }, 45_000); // 45s timeout for full network round-trip

      setShowResyncConfirm(false);
      console.log("[Profile] Manual Full Resync Complete");
    } catch (e: any) {
      console.error("[Profile] Resync Failed:", e);
      setResyncError(e.message || String(e));
    } finally {
      // Release the semaphore so HydrationSync can resume operations
      syncLock.isManualResyncActive = false;
      setIsResyncing(false);
      stopHealing();
    }
  };

  return (
    <UScroll 
      className="flex-1 bg-black"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 30, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── USER IDENTITY OVERVIEW ── */}
      <UView className="items-center mb-6 mt-2">
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

      {/* ── SECTION: ACCOUNT ── */}
      <UView className="mb-1">
        <HeaderTitle className="mb-2 text-2xl font-bold text-white">Account</HeaderTitle>
      </UView>
      <SettingsToggleCard
        className="mb-6"
        // @ts-ignore
        items={accountItems}
      />

      {/* ── SECTION: CUSTOMIZE ── */}
      <UView className="mb-1">
        <HeaderTitle className="mb-2 text-2xl font-bold text-white">Customize</HeaderTitle>
      </UView>
      <SettingsToggleCard
        className="mb-6"
        // @ts-ignore
        items={customizeItems}
      />

      {/* ── SECTION: SESSION & DATA ── */}
      <UView className="mb-1">
        <HeaderTitle className="mb-2 text-2xl font-bold text-white">Session & Data</HeaderTitle>
      </UView>
      <SettingsToggleCard
        className="mb-6"
        // @ts-ignore
        items={sessionItems}
      />

      {/* ── MODALS: CONFIRMATION FLOWS ── */}
      <ConfirmationModal
        visible={showLogoutConfirm}
        title="Are you sure you want to log out?"
        confirmText="Log Out"
        confirmColor="#FF3B30"
        isLoading={isLoggingOut}
        onConfirm={async () => {
          setIsLoggingOut(true);
          try {
            await authClient.signOut();
            try { await GoogleSignin.signOut(); } catch (e) {}
            setShowLogoutConfirm(false);
            router.replace("/(auth)/signin");
          } finally { setIsLoggingOut(false); }
        }}
        onCancel={() => !isLoggingOut && setShowLogoutConfirm(false)}
      />

      <ConfirmationModal
        visible={showResyncConfirm}
        title="Do you want to start a full Resync?"
        confirmText="Start Resync"
        confirmColor="#4FA0FF"
        isLoading={isResyncing}
        onConfirm={handleFullResync}
        onCancel={() => !isResyncing && setShowResyncConfirm(false)}
      >
        {resyncError && (
          <UView className="bg-red-500/20 p-3 rounded-xl border border-red-500/50">
            <FooterText className="text-red-400 text-xs text-center font-bold">
              {resyncError}
            </FooterText>
          </UView>
        )}
      </ConfirmationModal>

    </UScroll>
  );
}
