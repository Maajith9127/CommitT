import { useState } from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { PrimaryButton } from "@/components/ui";
import { TopBar, TabsBar, InlineAddBar, SelectableListItem } from "@/components/ui/blocklist";
import { ActionScreenLayout } from "@/components/ui/ActionScreenLayout";

const UView = withUniwind(View);

type Tab = "apps" | "webs" | "ai";

type BlockItem = {
  id: string;
  name: string;
  selected: boolean;
};

const TABS = [
  { key: "apps", label: "Apps" },
  { key: "webs", label: "Webs" },
  { key: "ai", label: "AI" },
];

export default function ChooseScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("apps");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [inlineText, setInlineText] = useState("");

  const [apps, setApps] = useState<BlockItem[]>([
    { id: "1", name: "Airtel", selected: true },
    { id: "2", name: "AC Remote Control", selected: false },
    { id: "3", name: "Alarmy", selected: false },
  ]);

  const [webs, setWebs] = useState<BlockItem[]>([
    { id: "w1", name: "amazon.in", selected: false },
    { id: "w2", name: "drive.google.com", selected: false },
    { id: "w3", name: "instagram.com", selected: false },
  ]);

  const filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const handleTabChange = (key: string) => {
    setActiveTab(key as Tab);
    setSearchOpen(false);
    setSearchText("");
  };

  const toggleApp = (id: string) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a)));
  };

  const toggleWeb = (id: string) => {
    setWebs((prev) => prev.map((w) => (w.id === id ? { ...w, selected: !w.selected } : w)));
  };

  const handleAddInline = () => {
    if (!inlineText.trim()) return;

    if (activeTab === "webs") {
      setWebs((prev) => [
        ...prev,
        { id: `w${Date.now()}`, name: inlineText.trim(), selected: true },
      ]);
    }
    // AI tab logic can be added later
    setInlineText("");
  };

  return (
    <ActionScreenLayout
      className="pt-10"
      footer={
        <PrimaryButton onPress={() => {}}>Save</PrimaryButton>
      }
    >
      {/* TOP BAR */}
      <TopBar
        onBack={() => router.back()}
        enableSearch={activeTab === "apps"}
        searchOpen={searchOpen}
        searchText={searchText}
        onSearchToggle={() => setSearchOpen((p) => !p)}
        onSearchChange={setSearchText}
      />

      {/* TITLE */}
      <UView className="mb-4">
        <HeaderTitle className="text-3xl mt-3">Blocklist</HeaderTitle>
      </UView>

      {/* TABS */}
      <TabsBar tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />

      {/* INLINE ADD BAR (WEBS + AI) */}
      {activeTab !== "apps" && (
        <InlineAddBar
          placeholder={activeTab === "webs" ? "Add website" : "Describe what to block"}
          value={inlineText}
          onChange={setInlineText}
          onSubmit={handleAddInline}
        />
      )}

      {/* CONTENT (APPs) */}
      {activeTab === "apps" &&
        filteredApps.map((app) => (
          <SelectableListItem
            key={app.id}
            icon="cellphone"
            label={app.name}
            selected={app.selected}
            onToggle={() => toggleApp(app.id)}
          />
        ))}

      {/* CONTENT (WEBS) */}
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

      {/* CONTENT (AI) */}
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
