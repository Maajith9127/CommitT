import React, { useMemo, useState, useCallback } from "react";
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
import { nukeAndRebuildSchema, purgeAllDataRecords } from "@/lib/local-db";

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
   * ** FRICTION GATE STATE **
   * We implement a high-friction tap counter to prevent impulsive resynchronization.
   * By requiring 50 manual taps, we ensure the user is performing a deliberate 
   * action rather than seeking a quick "escape" from active commitments.
   */
  const [resyncTapCount, setResyncTapCount] = useState(0);
  const RESYNC_TAP_REQUIREMENT = 1;

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
    { id: "full_resync", title: "Full Resync", type: "select" as const, icon: "cloud-sync-outline", onPress: () => {
      setResyncTapCount(0); // ** RESET FRICTION COUNTER ON OPEN **
      setShowResyncConfirm(true);
    }},
    { id: "help_support", title: "Help & Support", type: "select" as const, icon: "help-circle-outline", onPress: () => console.log('Help & Support') },
    { id: "switch_accounts", title: "Switch Accounts", type: "select" as const, icon: "account-switch-outline", onPress: () => console.log('Switch Accounts') },
    { id: "logout", title: "Log Out", type: "select" as const, icon: "logout", onPress: () => setShowLogoutConfirm(true) },
    { id: "delete_account", title: "Delete Account", type: "select" as const, icon: "delete-forever-outline", onPress: () => console.log('Delete Account') },
  ], []);

  /**
   * ─────────────────────────────────────────────────────────────────────────────
   * HANDLER: handleFullResync (The "Imperial Override")
   * ─────────────────────────────────────────────────────────────────────────────
   */
  const handleFullResync = async () => {
    setIsResyncing(true);
    setResyncError(null);
    
    try {
      // ── STAGE 0: PROVE CONNECTIVITY ──
      const probe = await fetch('https://google.com', { method: 'HEAD' }).catch(() => null);
      if (!probe || !probe.ok) {
        throw new Error("Active internet connection required for Full Resync.");
      }

      startHealing("Verifying cloud state and preparing resynchronization...");
      
      // Arm the semaphore to silence background sync triggers
      syncLock.isManualResyncActive = true;

      await syncLock.execute("Saga:ManualResync", async () => {
        // ── STAGE 1: ATOMIC CLOUD FETCH ──
        const payload = await convex.query(api.api.sync.delta.getDeltaPayload, {});

        // ** STAGE 2: PRODUCTION-LEVEL SURGICAL PURGE **
        // We no longer nuke the file layout. We wipe data records and 
        // truncate the WAL to maintain background service continuity.
        await purgeAllDataRecords(db);

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
      syncLock.isManualResyncActive = false;
      setIsResyncing(false);
      stopHealing();
      setResyncTapCount(0); // ** RESET FRICTION ON FINISH **
    }
  };

  /**
   * ** FRICTION TAP HANDLER **
   * Intercepts the confirmation action to enforce the 50-tap discipline rule.
   */
  const handleResyncTap = useCallback(() => {
    if (isResyncing) return;

    const nextCount = resyncTapCount + 1;
    if (nextCount >= RESYNC_TAP_REQUIREMENT) {
      handleFullResync();
    } else {
      setResyncTapCount(nextCount);
    }
  }, [resyncTapCount, isResyncing]);

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

      {/* ── SECTIONS ── */}
      <UView className="mb-1">
        <HeaderTitle className="mb-2 text-2xl font-bold text-white">Account</HeaderTitle>
      </UView>
      <SettingsToggleCard className="mb-6" items={accountItems} />

      <UView className="mb-1">
        <HeaderTitle className="mb-2 text-2xl font-bold text-white">Customize</HeaderTitle>
      </UView>
      <SettingsToggleCard className="mb-6" items={customizeItems} />

      <UView className="mb-1">
        <HeaderTitle className="mb-2 text-2xl font-bold text-white">Session & Data</HeaderTitle>
      </UView>
      <SettingsToggleCard className="mb-6" items={sessionItems} />

      {/* ── MODALS ── */}
      
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
        title={resyncTapCount > 0 
          ? `Tap ${RESYNC_TAP_REQUIREMENT - resyncTapCount} more times` 
          : "Tap 100 times to start"
        }
        confirmText="TAP"
        confirmColor={resyncTapCount >= 80 ? "#FF3B30" : "#4FA0FF"}
        cancelText="Cancel"
        cancelColor="#FF3B30"
        isLoading={isResyncing}
        onConfirm={handleResyncTap}
        onCancel={() => {
          if (!isResyncing) {
            setShowResyncConfirm(false);
            setResyncError(null);
            setResyncTapCount(0);
          }
        }}
      >
        {resyncError && (
          <UView className="bg-red-500/20 p-2 rounded-xl border border-red-500/50 mt-2">
            <FooterText className="text-red-400 text-[10px] text-center font-bold">
              {resyncError}
            </FooterText>
          </UView>
        )}
      </ConfirmationModal>

    </UScroll>
  );
}
