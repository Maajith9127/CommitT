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
import { ConfirmationModal } from "./ConfirmationModal";
import { useSQLiteContext } from "expo-sqlite";
import { useMutation } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { updateInstanceInLocalDb } from "@/lib/local-db-commits";

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
let _cachedApps: BlockItem[] | null = null;

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

  // 3. APPS STATE 
  const [apps, setApps] = useState<BlockItem[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  useEffect(() => {
    if (activeTab !== "apps") return;
    if (_cachedApps) {
      setApps(_cachedApps.map(app => ({
        ...app,
        selected: initialAppIds.indexOf(app.id) !== -1,
      })));
      return;
    }

    setIsLoadingApps(true);
    AppListerModule.getInstalledApps()
      .then((realApps: BlockItem[]) => {
        _cachedApps = realApps;
        setApps(realApps.map(app => ({
          ...app,
          selected: initialAppIds.indexOf(app.id) !== -1,
        })));
      })
      .catch((err: any) => console.error("Native Bridge Error:", err))
      .finally(() => setIsLoadingApps(false));
  }, [activeTab]);

  // 4. WEBSITES STATE
  const [webs, setWebs] = useState<BlockItem[]>(
    initialWebLinks.map((w: string, i: number) => ({ id: `w_init_${i}`, name: w, selected: true }))
  );

  // 5. FILTERING
  const filteredApps = apps.filter(app =>
    app.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // 6. ACTIONS
  const handleTabChange = (key: string) => {
    setActiveTab(key as Tab);
    setSearchOpen(false);
    setSearchText("");
  };

  const toggleApp = (id: string) => {
    setApps(prev => prev.map(a => (a.id === id ? { ...a, selected: !a.selected } : a)));
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
  const processSave = async () => {
    setIsSaving(true);
    try {
      const selectedAppIds = apps.filter(a => a.selected).map(a => a.id);
      const selectedWebs = webs.filter(w => w.selected).map(w => w.name);

      const newConditions = event.conditions.map((c: any) => {
         if (c.metric_key === "digital_commitment") {
           return {
             ...c,
             target: { ...c.target, value: { apps: selectedAppIds, websites: selectedWebs } }
           };
         }
         return c;
      });

      // 1. SYNC TO CLOUD FIRST (Per request)
      const result = await updateConvexInstance({ 
        id: event._id, 
        conditions: newConditions 
      }) as any;

      // Check if instance is locked (Strict Mode Violation)
      if (result.success === false && result.error === "STRICT_LOCK_ACTIVE") {
        setIsSaving(false);
        setShowSaveConfirm(false);
        // Transition to Lock Error modal
        setLockError({
          title: "Instance Locked",
          message: result.message || "This commitment is currently in its 'Strict Lock Zone' and cannot be edited until the lockout period ends."
        });
        return;
      }

      if (!result.success) {
        throw new Error(result.message || "Sync failed");
      }

      // 2. SYNC TO LOCAL DEVICE IMMEDIATELY (For hardware enforcer)
      await updateInstanceInLocalDb(db, event._id, { 
        conditions: newConditions 
      });

      console.log("[BlocklistView] Instance updated successfully.");
      setShowSaveConfirm(false);
      onClose();
    } catch (err) {
      Alert.alert("Save Failed", String(err));
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

      {/* ── Apps Tab: List ── */}
      {activeTab === "apps" &&
        filteredApps.map(app => (
          <SelectableListItem
            key={app.id}
            icon="cellphone"
            imageUri={app.iconBase64}
            label={app.name}
            selected={app.selected}
            onToggle={() => toggleApp(app.id)}
          />
        ))}

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
        cancelColor="#FF4F4F"
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
        confirmColor="#FF4F4F"
        onConfirm={() => setLockError(null)}
        onCancel={() => setLockError(null)}
      />
    </ActionScreenLayout>
  );
};
