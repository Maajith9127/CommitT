/**
 * ChooseScreen — Blocklist Configuration Screen
 * ═══════════════════════════════════════════════
 *
 * This screen allows the user to select which apps, websites, and AI-generated
 * rules should be included in their commitment's blocklist.
 *
 * ARCHITECTURE:
 *   - Uses `ActionScreenLayout` with a fixed header (tabs + search) and fixed
 *     footer (Save button). Only the list content scrolls.
 *   - The "Apps" tab fetches real installed applications from the device via
 *     the native Kotlin `AppListerModule` (including their actual icons).
 *   - The "Webs" tab supports inline manual entry of website URLs.
 *   - The "AI" tab is a placeholder for future AI-powered rule generation.
 *
 * DATA FLOW:
 *   1. Screen mounts → useEffect calls `AppListerModule.getInstalledApps()`
 *   2. Native Kotlin queries Android PackageManager (async, off UI thread)
 *   3. Returns sorted array of { id, name, iconBase64, selected }
 *   4. User toggles selections → local state updates
 *   5. "Save" button persists selections (TODO: wire to backend)
 *
 * @see modules/app-lister-module/ — Native Kotlin bridge for app enumeration
 * @see components/ui/blocklist/ — Reusable UI components (TopBar, TabsBar, etc.)
 * @see components/ui/ActionScreenLayout.tsx — 3-zone layout (header/scroll/footer)
 */
import { useState, useEffect, useMemo } from "react";
import { View, ActivityIndicator, FlatList } from "react-native";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { PrimaryButton } from "@/components/ui";
import { TopBar, TabsBar, InlineAddBar, SelectableListItem } from "@/components/ui/blocklist";
import { ActionScreenLayout } from "@/components/ui/ActionScreenLayout";
import { AppCardSkeleton } from "@/components/ui/skeletons/AppCardSkeleton";
import { useTaskDraftStore, type Condition } from "@/stores/useTaskDraftStore";
import { useAppStore } from "@/stores/useAppStore";

const UView = withUniwind(View);

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "apps" | "webs" | "ai";

/** Unified data shape for both apps and websites in the blocklist. */
type BlockItem = {
  /** Unique identifier — packageName for apps, generated ID for websites. */
  id: string;
  /** Display name (e.g. "Chrome" or "instagram.com"). */
  name: string;
  /** Whether the user has selected this item for blocking. */
  selected: boolean;
  /** Base64 data URI for app icon. Only populated for items from the Apps tab. */
  iconBase64?: string | null;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = [
  { key: "apps", label: "Apps" },
  { key: "webs", label: "Webs" },
  { key: "ai", label: "AI" },
];

// ─── Module-Level App Cache ──────────────────────────────────────────────────
// (DEPRECATED: Now handled by useAppStore globally)

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChooseScreen() {
  const router = useRouter();

  // ── Store Integration ──
  const conditions = useTaskDraftStore((s: any) => s.draft.conditions);
  const setBlocklist = useTaskDraftStore((s: any) => s.setBlocklist);

  // Derived current blocklist from store
  const blockCondition = conditions.find((c: Condition) => c.metric_key === "digital_commitment");
  const storeApps = (blockCondition?.target.value as { apps: string[]; websites: string[] })?.apps || [];
  const storeWebs = (blockCondition?.target.value as { apps: string[]; websites: string[] })?.websites || [];

  // ── Tab & Search State ──
  const [activeTab, setActiveTab] = useState<Tab>("apps");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [inlineText, setInlineText] = useState("");

  // ── High Performance Discovery State ──
  const discoveredApps = useAppStore((s: any) => s.apps);

  // Compute reactive app list with current selection states (RESTORED FULL LIST)
  const apps = useMemo(() => {
    return discoveredApps.map(app => ({
      ...app,
      selected: storeApps.indexOf(app.id) !== -1
    }));
  }, [discoveredApps, storeApps]);

  const isLoadingApps = discoveredApps.length === 0;

  // ── Websites State (manually entered by user) ──
  // Initialize from store on mount
  const [webs, setWebs] = useState<BlockItem[]>(
    storeWebs.map((w: string, i: number) => ({ id: `w_init_${i}`, name: w, selected: true })),
  );

  // ── Derived State ──
  const filteredApps = apps.filter((app: BlockItem) =>
    app.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  // ── Event Handlers ──

  const handleTabChange = (key: string) => {
    setActiveTab(key as Tab);
    setSearchOpen(false);
    setSearchText("");
  };

  /** Toggles selecting an app and IMMEDIATELY updates the store. */
  const toggleApp = (id: string) => {
    console.log(`[Blocklist] Toggling app: ${id}`);
    
    // Toggle logic injected directly into the draft store
    const nextSelected = storeApps.includes(id)
      ? storeApps.filter(pkg => pkg !== id)
      : [...storeApps, id];

    setBlocklist({ apps: nextSelected });
  };

  /** Toggles selecting a website and IMMEDIATELY updates the store. */
  const toggleWeb = (id: string) => {
    console.log(`[Blocklist] Toggling website item: ${id}`);

    setWebs((prev: BlockItem[]) => {
      const next = prev.map((w: BlockItem) => (w.id === id ? { ...w, selected: !w.selected } : w));

      // Update store immediately
      const currentSelected = next.filter((w: BlockItem) => w.selected).map((w: BlockItem) => w.name);
      setBlocklist({ websites: currentSelected });

      return next;
    });
  };

  /** Adds a new website entry and IMMEDIATELY updates the store. */
  const handleAddInline = () => {
    if (!inlineText.trim()) return;

    if (activeTab === "webs") {
      const newWeb = { id: `w${Date.now()}`, name: inlineText.trim(), selected: true };

      setWebs((prev: BlockItem[]) => {
        const next = [...prev, newWeb];

        // Update store
        const currentSelected = next.filter((w: BlockItem) => w.selected).map((w: BlockItem) => w.name);
        setBlocklist({ websites: currentSelected });

        return next;
      });

      console.log(`[Blocklist] Added website: ${newWeb.name}`);
    }
    // TODO: AI tab — send prompt to backend for rule generation
    setInlineText("");
  };

  // ── Fixed Header Content ──
  const headerContent = (
    <>
      <TopBar
        onBack={() => router.back()}
        enableSearch={activeTab === "apps"}
        searchOpen={searchOpen}
        searchText={searchText}
        onSearchToggle={() => setSearchOpen((p) => !p)}
        onSearchChange={setSearchText}
      />

      <UView className="mb-4">
        <HeaderTitle className="text-3xl mt-3">Blocklist</HeaderTitle>
      </UView>

      <TabsBar tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

      {/* Inline input bar only visible on Webs and AI tabs */}
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

  // ── Render ──
  return (
    <ActionScreenLayout
      className="pt-10"
      header={headerContent}
      scrollable={activeTab !== "apps"} // Only apps tab needs high-performance virtualization
      footer={
        <PrimaryButton onPress={() => router.back()}>Save</PrimaryButton>
      }
    >
      {/* ── Apps Tab: Loading State ── */}
      {activeTab === "apps" && apps.length === 0 && isLoadingApps && (
        <>
          {Array.from({ length: 12 }).map((_, i) => (
            <AppCardSkeleton key={i} />
          ))}
        </>
      )}

      {/* ── Apps Tab: Virtualized List ── */}
      {activeTab === "apps" && (
        <FlatList
          data={filteredApps}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          windowSize={5}
          renderItem={({ item }) => (
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
        webs.map((web: BlockItem) => (
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
    </ActionScreenLayout>
  );
}
