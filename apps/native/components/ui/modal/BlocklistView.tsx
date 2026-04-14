/**
 * BlocklistView — Blocklist Configuration Screen (Mirror of choose.tsx)
 * ═════════════════════════════════════════════════
 */
import React, { useState, useEffect } from "react";
import { View, Text, Alert, ActivityIndicator } from "react-native";
import { withUniwind } from "uniwind";
import { TopBar, TabsBar, InlineAddBar, SelectableListItem } from "@/components/ui/blocklist";
import { ActionScreenLayout } from "@/components/ui/ActionScreenLayout";
import { AppListerModule } from "../../../modules/app-lister-module";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { PrimaryButton } from "@/components/ui/button";
import { AppCardSkeleton } from "@/components/ui/skeletons/AppCardSkeleton";
import { useAppStore } from "@/stores/useAppStore";
import { useMemo } from "react";
import { FlatList } from "react-native";
import { ConfirmationModal } from "./ConfirmationModal";
import { useSQLiteContext } from "expo-sqlite";
import { useMutation } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { updateInstanceInLocalDb } from "@/lib/local-db-commits";
import { TripleWriteOrchestrator } from "@/lib/triple-write-orchestrator";
import { getLocalSyncToken, ingestDeltaPayload } from "@/lib/sync-engine";
import { useChaosStore } from "@/stores/useChaosStore";
import { useHealStore } from "@/stores/useHealStore";
import { useConvex } from "convex/react";
import { scheduleNextAlarm } from "@/modules/scheduler-module";
import { Logger } from "@/lib/logger";

const UView = withUniwind(View);

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "apps" | "webs" | "ai";

type BlockItem = {
  id: string;
  name: string;
  selected: boolean;
  iconBase64?: string | null;
};

// ─── Shared Session Cache ─────────────────────────────────────────────────────
// (Shared Session Cache DEPRECATED: Now handled by global useAppStore)

// ─── Component ───────────────────────────────────────────────────────────────

interface BlocklistViewProps {
  event: any;
  onClose: () => void;
}

const TABS = [
  { key: "apps", label: "Apps" },
  { key: "webs", label: "Webs" },
  { key: "ai", label: "AI" },
];

export const BlocklistView = ({ event, onClose }: BlocklistViewProps) => {
  const db = useSQLiteContext();
  const convex = useConvex();
  const { startHealing, stopHealing } = useHealStore();
  const updateConvexInstance = useMutation(api.api.instances.update.update);

  // 1. EXTRACT INITIAL COMMITMENT STATE
  const blockCondition = event?.conditions?.find((c: any) => c.metric_key === "digital_commitment");
  const initialAppIds = (blockCondition?.target?.value as any)?.apps || [];
  const initialWebLinks = (blockCondition?.target?.value as any)?.websites || [];

  // 2. TABS & SEARCH STATE
  const [activeTab, setActiveTab] = useState<Tab>("apps");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [inlineText, setInlineText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [lockError, setLockError] = useState<{ title: string; message: string } | null>(null);

  // 3. APPS STATE (Virtualized via Global Store)
  const discoveredApps = useAppStore((s: any) => s.apps);
  const isLoadingApps = discoveredApps.length === 0;

  // Compute reactive app list with current selection states (SORTED BY SELECTION)
  const apps = useMemo(() => {
    return discoveredApps
      .map(app => ({
        ...app,
        selected: initialAppIds.indexOf(app.id) !== -1,
      }))
      .sort((a: any, b: any) => {
        if (a.selected && !b.selected) return -1;
        if (!a.selected && b.selected) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [discoveredApps, initialAppIds.join(',')]);

  // 4. WEBSITES STATE
  const [webs, setWebs] = useState<BlockItem[]>(
    initialWebLinks.map((w: string, i: number) => ({ id: `w_init_${i}`, name: w, selected: true }))
  );

  // 5. LOCAL SELECTION STATE (Used for tempering edits before save)
  const [localAppSelections, setLocalAppSelections] = useState<string[]>(initialAppIds);

  // 6. FILTERING (Applied to the reactive store-backed list)
  const reactiveApps = useMemo(() => {
    return apps.map(a => ({
      ...a,
      selected: localAppSelections.includes(a.id)
    }));
  }, [apps, localAppSelections]);

  const filteredApps = reactiveApps.filter(app =>
    app.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // 6. ACTIONS
  const handleTabChange = (key: string) => {
    setActiveTab(key as Tab);
    setSearchOpen(false);
    setSearchText("");
  };

  const toggleApp = (id: string) => {
    // Note: We use the `apps` computed from store, but for toggling in the modal, 
    // we need to manage the temporary local selection before the user hits "Save".
    setLocalAppSelections((prev: string[]) => 
      (prev as any).includes(id) ? (prev as any).filter((p: any) => p !== id) : [...prev, id]
    );
  };

  const toggleWeb = (id: string) => {
    setWebs(prev => prev.map(w => (w.id === id ? { ...w, selected: !w.selected } : w)));
  };

  const handleAddInline = () => {
    if (!inlineText.trim()) return;
    if (activeTab === "webs") {
      setWebs(prev => [...prev, { id: `w${Date.now()}`, name: inlineText.trim(), selected: true }]);
    }
    setInlineText("");
  };

  // ─── FINAL PERSISTENCE LOGIC ───────────────────────────────────────────────
  /**
   * @saga    BLOCKLIST_UPDATE_ORCHESTRATOR
   * @desc    Synchronizes digital app/website blocklist changes across Cloud, Disk, and Hardware.
   * @access  Internal (BlocklistView)
   *
   * Flow:
   * 1. Cloud Sync: Update digital_commitment conditions in Convex.
   * 2. Forward-Heal Loop (Step 1 Compensation):
   *    - On device failure post-cloud success, enter blocking recovery.
   *    - Pull fresh Delta Payload via Sync Engine.
   *    - Refresh Native App Blocking Engine (scheduleNextAlarm).
   * 3. Disk Sync: Update local blocklist cache in SQLite.
   * 4. Hardware Sync: Force a native blocklist re-enforcement.
   *
   * Note:
   * - Critical for preventing "Enforcement Leaks" where apps remain accessible after blocking.
   * - Sync machines are infinite-retry to guarantee absolute compliance.
   */
  const processSave = async () => {
    setIsSaving(true);
    
    // ╔══════════════════════════════════════════════════════════════════════════════╗
    // ║  BLOCKLIST UPDATE SAGA                                                       ║
    // ╠══════════════════════════════════════════════════════════════════════════════╣
    // ║  Updating the blocklist changes what the phone allows/blocks.               ║
    // ║  If the hardware doesn't acknowledge the new list, we must not commit.      ║
    // ╚══════════════════════════════════════════════════════════════════════════════╝
    const contextSnapshot = { 
        instanceId: event._id,
        appIds: localAppSelections,
        websites: webs.filter(w => w.selected).map(w => w.name)
    };
    
    const orchestrator = new TripleWriteOrchestrator(contextSnapshot);

    orchestrator
      .addStep(
        "Cloud Sync (Convex Blocklist)",
        async (ctx) => {
          if (typeof __DEV__ !== 'undefined' && __DEV__ && useChaosStore.getState().faultCloudWrite) 
             throw new Error("[CHAOS] Convex save failed.");

          const newConditions = event.conditions.map((c: any) => {
             if (c.metric_key === "digital_commitment") {
               return {
                 ...c,
                 target: { ...c.target, value: { apps: ctx.appIds, websites: ctx.websites } }
               };
             }
             return c;
          });

          const result = await updateConvexInstance({ 
            id: ctx.instanceId, 
            conditions: newConditions 
          }) as any;

          if (result.success === false && result.error === "STRICT_LOCK_ACTIVE") {
            throw new Error(result.message || "Instance Locked");
          }

          if (!result.success) throw new Error(result.message || "Cloud sync refused");
          
          return { updatedConditions: newConditions };
        },
        async (ctx) => {
          // ═══════════════════════════════════════════════════════════════════
          // CLOUD-FIRST IMPERIAL STRATEGY (Forward-Heal)
          // ═══════════════════════════════════════════════════════════════════
          Logger.warn(`[BlocklistSaga] Blocklist save succeeded in Cloud but failed locally for instance: ${ctx.instanceId}`);
          startHealing("Synchronizing blocklist update...");
          
          let attempts = 0;
          while (true) {
            try {
              attempts++;
              if (attempts > 1) {
                startHealing(`Retrying blocklist sync (Attempt ${attempts})...`);
              }

              // 1. Sync Delta (Pull the new blocklist conditions from Cloud to SQLite)
              const token = await getLocalSyncToken();
              const payload = await convex.query(api.api.sync.delta.getDeltaPayload, { 
                last_synced_at: token || undefined 
              });
              await ingestDeltaPayload(db, payload);

              // 2. Hardware Enforcer Refresh
              scheduleNextAlarm();
              
              Logger.info(`[BlocklistSaga] Blocklist healed successfully on attempt ${attempts}`);
              break;

            } catch (error) {
              Logger.error(`[BlocklistSaga] Blocklist repair attempt ${attempts} failed:`, error);
              await new Promise(r => setTimeout(r, 2000));
            }
          }
          
          stopHealing();
        }
      )
      .addStep(
        "Disk Sync (Local SQLite Blocklist)",
        async (ctx, prev) => {
            if (typeof __DEV__ !== 'undefined' && __DEV__ && useChaosStore.getState().faultDiskWrite) 
               throw new Error("[CHAOS] SQLite save failed.");
            
            const conditions = prev["Cloud Sync (Convex Blocklist)"].updatedConditions;
            await updateInstanceInLocalDb(db, ctx.instanceId, { conditions });
        }
      )
      .addStep(
        "Hardware Sync (Re-enforce Apps)",
        async () => {
            if (typeof __DEV__ !== 'undefined' && __DEV__ && useChaosStore.getState().faultHardware) 
               throw new Error("[CHAOS] Android enforcer failed to refresh.");
            
            // CRITICAL: Notify the Android Accessibility Service and Alarm module
            // that the blocklist HAS changed.
            scheduleNextAlarm();
        }
      );

    try {
        const exec = await orchestrator.execute();

        // IMPERIAL SUCCESS CHECK: If cloud save succeeded, the device is stable.
        const cloudSaveSuccess = !!exec.results["Cloud Sync (Convex Blocklist)"];
        const finalSuccess = exec.success || cloudSaveSuccess;
        const finalError = finalSuccess ? null : exec.error;

        if (finalSuccess) {
            setShowSaveConfirm(false);
            onClose();
        } else {
            if (finalError === "Instance Locked") {
                setLockError({
                  title: "Instance Locked",
                  message: "This commitment is in its 'Strict Lock Zone' and cannot be edited."
                });
            } else {
                Alert.alert("Interaction Aborted", finalError || "Device synchronization failed.");
            }
            setShowSaveConfirm(false);
        }
    } catch (err: any) {
        Logger.error("[BlocklistSaga] Save Panic:", err);
        Alert.alert("System Failure", err.message || String(err));
        setShowSaveConfirm(false);
    } finally {
        setIsSaving(false);
    }
  };

  // 7. HEADER CONTENT
  const headerContent = (
    <>
      <TopBar
        onBack={onClose}
        enableSearch={activeTab === "apps"}
        searchOpen={searchOpen}
        searchText={searchText}
        onSearchToggle={() => setSearchOpen(p => !p)}
        onSearchChange={setSearchText}
      />

      <UView className="mb-4">
        <HeaderTitle className="text-3xl mt-3">Blocklist</HeaderTitle>
      </UView>

      <TabsBar tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

      {activeTab !== "apps" && (
        <InlineAddBar
          placeholder={activeTab === "webs" ? "Add website" : "Describe what to block"}
          value={inlineText}
          onChange={setInlineText}
          onSubmit={handleAddInline}
        />
      )}
    </>
  );

  return (
    <ActionScreenLayout
      className="pt-10"
      header={headerContent}
      scrollable={activeTab !== "apps"}
      fullWidthContent={activeTab === "apps"}
      footer={
        <PrimaryButton onPress={() => setShowSaveConfirm(true)}>
          Save Changes
        </PrimaryButton>
      }
      paddingHorizontal={16}
    >
      {/* ── Apps Tab: Loading ── */}
      {activeTab === "apps" && apps.length === 0 && isLoadingApps && (
        <>
          {Array.from({ length: 12 }).map((_, i) => <AppCardSkeleton key={i} />)}
        </>
      )}

      {/* ── Apps Tab: Virtualized List ── */}
      {activeTab === "apps" && (
        <FlatList
          data={filteredApps}
          keyExtractor={(item: any) => item.id}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          windowSize={5}
          renderItem={({ item }: { item: any }) => (
            <SelectableListItem
              icon="cellphone"
              imageUri={item.iconUri}
              label={item.name}
              selected={item.selected}
              onToggle={() => toggleApp(item.id)}
            />
          )}
        />
      )}

      {/* ── Webs Tab ── */}
      {activeTab === "webs" &&
        webs.map(web => (
          <SelectableListItem
            key={web.id}
            icon="web"
            label={web.name}
            selected={web.selected}
            onToggle={() => toggleWeb(web.id)}
          />
        ))}

      {/* ── AI Tab (Placeholder) ── */}
      {activeTab === "ai" && (
        <UView className="py-10 items-center">
          <FooterText className="text-gray-500 text-center">
            AI-generated rules will appear here
          </FooterText>
        </UView>
      )}

      {/* Double-Confirmation Modal */}
      <ConfirmationModal
        visible={showSaveConfirm}
        title="Save your selection? This immediately updates your blocked apps list."
        confirmText="Save"
        cancelText="Discard"
        cancelColor="#FF3B30"
        isLoading={isSaving}
        onConfirm={processSave}
        onCancel={() => setShowSaveConfirm(false)}
      />

      {/* Lock Error Modal (Acknowledgement style) */}
      <ConfirmationModal
        visible={!!lockError}
        title="Commitment Locked: This instance is in its 'Strict Lock Zone' and cannot be edited."
        confirmText="Understood"
        singleButton
        confirmColor="#FF3B30"
        onConfirm={() => setLockError(null)}
        onCancel={() => setLockError(null)}
      />
    </ActionScreenLayout>
  );
};
