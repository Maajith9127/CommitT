/**
 * EditDigitalPresetScreen — Standalone screen for managing digital (app/web) blocklists.
 * ─────────────────────────────────────────────────────────────────────────────
 * PRODUCTION RATIONALE: "Refinement over Redundancy"
 *   Reuses the premium component library from BlocklistView (SelectableListItem, TopBar, etc.)
 *   to ensure a consistent, familiar UI while refocusing the logic from instance-patching
 *   to preset-library management.
 * 
 * DESIGN: "Expressive Constraints"
 *   A dark-themed, immersive interface that makes scanning and selecting apps feel
 *   satisfying rather than tedious.
 */
import React, { useState, useMemo } from "react";
import { View, Text, Alert, FlatList, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { withUniwind } from "uniwind";
import { TopBar, TabsBar, InlineAddBar, SelectableListItem } from "@/components/ui/blocklist";
import { ActionScreenLayout } from "@/components/ui/ActionScreenLayout";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { PrimaryButton } from "@/components/ui/button";
import { AppCardSkeleton } from "@/components/ui/skeletons/AppCardSkeleton";
import { useAppStore } from "@/stores/useAppStore";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import { useMutation } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { COLORS } from "@/config/theme";

const UView = withUniwind(View);

type Tab = "apps" | "webs";

type BlockItem = {
  id: string;
  name: string;
  selected: boolean;
};

export default function EditDigitalPresetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ 
    presetId?: string; 
    apps?: string; 
    websites?: string; 
    name?: string 
  }>();

  const presetId = params.presetId as any;
  const initialAppIds = useMemo(() => (params.apps ? JSON.parse(params.apps) : []), [params.apps]);
  const initialWebLinks = useMemo(() => (params.websites ? JSON.parse(params.websites) : []), [params.websites]);

  // ── Mutations ──
  const updatePreset = useMutation(api.api.commitments.presets.updateDigitalPreset);
  const createPreset = useMutation(api.api.commitments.presets.createDigitalPreset);

  // ── State ──
  const [activeTab, setActiveTab] = useState<Tab>("apps");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [inlineText, setInlineText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // ── Apps Data (via Global Store) ──
  const discoveredApps = useAppStore((s: any) => s.apps);
  const isLoadingApps = discoveredApps.length === 0;

  // Local selection state
  const [localAppSelections, setLocalAppSelections] = useState<string[]>(initialAppIds);
  const [webs, setWebs] = useState<BlockItem[]>(
    initialWebLinks.map((w: string, i: number) => ({ id: `w_init_${i}`, name: w, selected: true }))
  );

  // ── Filtering Logic ──
  const filteredApps = useMemo(() => {
    return discoveredApps
      .map(app => ({
        ...app,
        selected: localAppSelections.includes(app.id),
      }))
      .filter(app => app.name.toLowerCase().includes(searchText.toLowerCase()))
      .sort((a, b) => {
        if (a.selected && !b.selected) return -1;
        if (!a.selected && b.selected) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [discoveredApps, localAppSelections, searchText]);

  // ── Actions ──
  const toggleApp = (id: string) => {
    setLocalAppSelections(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finalApps = localAppSelections;
      const finalWebs = webs.filter(w => w.selected).map(w => w.name);
      
      if (presetId) {
        await updatePreset({
          id: presetId,
          apps: finalApps,
          websites: finalWebs,
          name: params.name || "My Blocklist",
        });
      } else {
        await createPreset({
          apps: finalApps,
          websites: finalWebs,
          name: params.name || "My Blocklist",
        });
      }
      router.back();
    } catch (err) {
      Alert.alert("Save Failed", String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const headerContent = (
    <>
      <TopBar
        onBack={() => router.back()}
        enableSearch={activeTab === "apps"}
        searchOpen={searchOpen}
        searchText={searchText}
        onSearchToggle={() => setSearchOpen(p => !p)}
        onSearchChange={setSearchText}
      />

      <UView className="mb-4">
        <HeaderTitle className="text-3xl mt-3">Edit Blocklist</HeaderTitle>
      </UView>

      <TabsBar 
        tabs={[
          { key: "apps", label: "Apps" },
          { key: "webs", label: "Webs" },
        ]} 
        activeTab={activeTab} 
        onChange={(key) => setActiveTab(key as Tab)} 
      />

      {activeTab === "webs" && (
        <InlineAddBar
          placeholder="Add website URL"
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
          Save Preset
        </PrimaryButton>
      }
      paddingHorizontal={16}
    >
      {/* ── Apps Tab ── */}
      {activeTab === "apps" && isLoadingApps && (
        <>
          {Array.from({ length: 12 }).map((_, i) => <AppCardSkeleton key={i} />)}
        </>
      )}

      {activeTab === "apps" && !isLoadingApps && (
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

      <ConfirmationModal
        visible={showSaveConfirm}
        title="Save your selection? This will update your preset library."
        confirmText="Save"
        cancelText="Discard"
        cancelColor="#FF3B30"
        isLoading={isSaving}
        onConfirm={handleSave}
        onCancel={() => setShowSaveConfirm(false)}
      />
    </ActionScreenLayout>
  );
}
