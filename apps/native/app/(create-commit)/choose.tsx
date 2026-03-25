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
import { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { PrimaryButton } from "@/components/ui";
import { TopBar, TabsBar, InlineAddBar, SelectableListItem } from "@/components/ui/blocklist";
import { ActionScreenLayout } from "@/components/ui/ActionScreenLayout";
import { AppListerModule } from "../../modules/app-lister-module";
import { AppCardSkeleton } from "@/components/ui/skeletons/AppCardSkeleton";

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChooseScreen() {
  const router = useRouter();

  // ── Tab & Search State ──
  const [activeTab, setActiveTab] = useState<Tab>("apps");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [inlineText, setInlineText] = useState("");

  // ── Apps State (populated from native Kotlin module) ──
  const [apps, setApps] = useState<BlockItem[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  /** Ref-based load guard — avoids the stale closure problem of reading
   *  `apps.length` inside a useEffect that doesn't list `apps` as a dep.
   *  A ref is immune to the closure issue because `.current` is always fresh. */
  const hasLoadedApps = useRef(false);

  /**
   * Native App Fetcher
   *
   * Calls into the Kotlin `AppListerModule` to retrieve all launchable apps
   * on the device. Uses `hasLoadedApps` ref to prevent redundant native bridge
   * calls when the user switches tabs back and forth.
   *
   * WHY `activeTab` in deps?
   *   We only trigger the fetch when the user first lands on the "apps" tab.
   *   Subsequent tab switches reuse the cached state.
   */
  useEffect(() => {
    if (activeTab !== "apps" || hasLoadedApps.current) return;

    setIsLoadingApps(true);
    AppListerModule.getInstalledApps()
      .then((realApps) => {
        setApps(realApps);
        hasLoadedApps.current = true;
      })
      .catch((error) => console.error("Native App Lister Error:", error))
      .finally(() => setIsLoadingApps(false));
  }, [activeTab]);

  // ── Websites State (manually entered by user) ──
  const [webs, setWebs] = useState<BlockItem[]>([
    { id: "w1", name: "amazon.in", selected: false },
    { id: "w2", name: "drive.google.com", selected: false },
    { id: "w3", name: "instagram.com", selected: false },
  ]);

  // ── Derived State ──
  /** Live-filtered app list based on the search bar input. */
  const filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  // ── Event Handlers ──

  const handleTabChange = (key: string) => {
    setActiveTab(key as Tab);
    setSearchOpen(false);
    setSearchText("");
  };

  /** Toggles the `selected` state of a single app by its package name. */
  const toggleApp = (id: string) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a)));
  };

  /** Toggles the `selected` state of a single website entry. */
  const toggleWeb = (id: string) => {
    setWebs((prev) => prev.map((w) => (w.id === id ? { ...w, selected: !w.selected } : w)));
  };

  /** Adds a new website/AI rule from the inline text input. */
  const handleAddInline = () => {
    if (!inlineText.trim()) return;

    if (activeTab === "webs") {
      setWebs((prev) => [
        ...prev,
        { id: `w${Date.now()}`, name: inlineText.trim(), selected: true },
      ]);
    }
    // TODO: AI tab — send prompt to backend for rule generation
    setInlineText("");
  };

  // ── Fixed Header Content ──
  // Extracted into a variable so it can be passed to ActionScreenLayout's
  // `header` prop. This keeps it pinned above the scroll area.
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
      footer={
        <PrimaryButton onPress={() => {}}>Save</PrimaryButton>
      }
    >
      {/* ── Apps Tab: Loading State ── */}
      {activeTab === "apps" && isLoadingApps && (
        <>
          {/* Render 12 skeleton rows to fill the screen while native apps fetch */}
          {Array.from({ length: 12 }).map((_, i) => (
            <AppCardSkeleton key={i} />
          ))}
        </>
      )}

      {/* ── Apps Tab: Loaded List ── */}
      {activeTab === "apps" && !isLoadingApps &&
        filteredApps.map((app) => (
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
        webs.map((web) => (
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
