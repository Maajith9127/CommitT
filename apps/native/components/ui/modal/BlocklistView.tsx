import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, ActivityIndicator, Image, Pressable, Alert } from "react-native";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActionScreenLayout } from "@/components/ui/ActionScreenLayout";
import { TopBar, TabsBar, InlineAddBar, SelectableListItem } from "../blocklist";
import { AppListerModule } from "../../../modules/app-lister-module";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { PrimaryButton } from "@/components/ui/button";
import { AppCardSkeleton } from "@/components/ui/skeletons/AppCardSkeleton";
import { useSQLiteContext } from "expo-sqlite";
import { useMutation } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { updateInstanceInLocalDb } from "@/lib/local-db-commits";

const UView = withUniwind(View);

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

  // 1. EXTRACT INITIAL STATE
  const blockCondition = event?.conditions?.find((c: any) => c.metric_key === "digital_commitment");
  const initialApps = blockCondition?.target?.value?.apps || [];
  const initialWebLinks = blockCondition?.target?.value?.websites || [];

  // 2. STATE
  const [activeTab, setActiveTab] = useState<"apps" | "webs" | "ai">("apps");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [inlineText, setInlineText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ── Apps State (populated from native Kotlin module) ──
  const [apps, setApps] = useState<any[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  // ── Websites State (manually entered by user) ──
  const [webs, setWebs] = useState<string[]>(initialWebLinks);

  // 3. LOAD DATA
  useEffect(() => {
    if (activeTab !== "apps") return;
    if (apps.length > 0) return;

    setIsLoadingApps(true);
    AppListerModule.getInstalledApps()
      .then((realApps: any[]) => {
        setApps(realApps.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch((error: any) => console.error("Native App Lister Error:", error))
      .finally(() => setIsLoadingApps(false));
  }, [activeTab]);

  // Seeding the apps with selection from event
  const processedApps = useMemo(() => {
    const selectedSet = new Set(initialApps);
    return apps.map(app => ({
      ...app,
      selected: selectedSet.has(app.id)
    }));
  }, [apps, initialApps]);

  // Current selections (tracked locally for edit)
  const [currentSelectedApps, setCurrentSelectedApps] = useState<Set<string>>(new Set(initialApps));

  // 4. FILTERING
  const filteredApps = useMemo(() => {
    const filtered = apps.filter((app: any) =>
      app.name.toLowerCase().includes(searchText.toLowerCase()),
    );
    return filtered.map(app => ({
        ...app,
        selected: currentSelectedApps.has(app.id)
    }));
  }, [apps, searchText, currentSelectedApps]);

  // 5. ACTIONS
  const handleTabChange = (key: string) => {
    setActiveTab(key as any);
    setSearchOpen(false);
    setSearchText("");
  };

  const toggleApp = (id: string) => {
    setCurrentSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddWeb = () => {
    if (!inlineText.trim()) return;
    setWebs((prev) => [...prev, inlineText.trim()]);
    setInlineText("");
  };

  const handleSave = async () => {
     setIsSaving(true);
     try {
       const newConditions = event.conditions.map((c: any) => {
         if (c.metric_key === "digital_commitment") {
           return {
             ...c,
             target: {
               ...c.target,
               value: {
                 ...c.target.value,
                 apps: Array.from(currentSelectedApps),
                 websites: webs
               }
             }
           };
         }
         return c;
       });

       // SYNC 1: CONVEX
       await updateConvexInstance({
         id: event._id,
         conditions: newConditions
       });

       // SYNC 2: LOCAL SQLITE (Immediate Enforcer Update)
       await updateInstanceInLocalDb(db, event._id, {
         conditions: newConditions
       });

       console.log("[BlocklistView] Instance updated successfully!");
       onClose();
     } catch (err) {
       Alert.alert("Save Failed", String(err));
     } finally {
       setIsSaving(false);
     }
  };

  // 6. COMPOSED HEADER CONTENT (Ditto layout of choose.tsx)
  const headerContent = (
    <>
      <TopBar
        onBack={onClose}
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

      {activeTab !== "apps" && (
        <InlineAddBar
          placeholder={activeTab === "webs" ? "Add website" : "Describe what to block"}
          value={inlineText}
          onChange={setInlineText}
          onSubmit={handleAddWeb}
        />
      )}
    </>
  );

  const footerContent = (
    <PrimaryButton 
      onPress={handleSave} 
      disabled={isSaving}
    >
      {isSaving ? 'Saving...' : 'Save Changes'}
    </PrimaryButton>
  );

  // 7. RENDER
  return (
    <ActionScreenLayout
      className="pt-10"
      header={headerContent}
      footer={footerContent}
      paddingHorizontal={16}
    >
      {/* ── Apps Tab: Loading State ── */}
      {activeTab === "apps" && apps.length === 0 && isLoadingApps && (
        <>
          {Array.from({ length: 12 }).map((_, i) => (
            <AppCardSkeleton key={i} />
          ))}
        </>
      )}

      {/* ── Apps Tab: Loaded List ── */}
      {activeTab === "apps" &&
        filteredApps.map((app: any) => (
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
        webs.map((web: string, idx: number) => (
          <SelectableListItem
            key={`${web}-${idx}`}
            icon="web"
            label={web}
            selected={true}
            onToggle={() => setWebs((p) => p.filter((_, i) => i !== idx))}
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
};
