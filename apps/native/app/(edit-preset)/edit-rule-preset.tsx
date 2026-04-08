import React from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BodyText, HeaderTitle } from '@/components/ui/text';
import { ActionScreenLayout } from '@/components/ui/ActionScreenLayout';
import { PrimaryButton, Input } from '@/components/ui';
import { SettingsToggleCard } from "@/components/ui/commits/SettingsToggleCard";
import { SelectionSheet, type SelectionOption } from "@/components/ui/modal/SelectionSheet";

/** Selection options for advanced settings (Mirrored from final.tsx) */
const SETTINGS_OPTIONS = {
  gracePeriod: [
    { label: "5 minutes", value: 5 },
    { label: "10 minutes", value: 10 },
    { label: "15 minutes", value: 15 },
    { label: "20 minutes", value: 20 },
    { label: "30 minutes", value: 30 },
  ],
  alarmLeadTime: [
    { label: "15 mins before", value: 15 },
    { label: "30 mins before", value: 30 },
    { label: "45 mins before", value: 45 },
    { label: "60 mins before", value: 60 },
  ],
  intensity: [
    { label: "Relaxed", value: "relaxed", description: "Fewer random check-ins during the interval" },
    { label: "Moderate", value: "moderate", description: "Standard amount of random check-ins" },
    { label: "Strict", value: "strict", description: "Frequent random check-ins during the interval" },
  ],
  maxMissedCheckins: [
    { label: "Zero Tolerance", value: 0, description: "Ultra Strict: Miss 1 and fail" },
    { label: "1 Missed Check-in", value: 1, description: "Strict: Room for one mistake" },
    { label: "2 Missed Check-ins", value: 2, description: "Moderate: Room for a couple of mistakes" },
    { label: "3 Missed Check-ins", value: 3, description: "Lenient: Fail only if you miss 3+" },
  ],
  alarmInterval: [
    { label: "Every 2 mins", value: 2 },
    { label: "Every 5 mins", value: 5 },
    { label: "Every 10 mins", value: 10 },
  ],
  alarmSound: [
    { label: "Default", value: "Default" },
    { label: "Calm", value: "Calm" },
    { label: "Energetic", value: "Energetic" },
    { label: "Warning", value: "Warning" },
  ],
};

/**
 * EditRulePresetScreen
 */
export default function EditRulePresetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // ── State ──
  const [name, setName] = React.useState(params.name as string || "New Rule");
  const [style, setStyle] = React.useState(params.style as string || "just_show_up");
  const [intensity, setIntensity] = React.useState(params.intensity as string || "moderate");
  const [maxMissed, setMaxMissed] = React.useState(1);
  const [grace, setGrace] = React.useState(parseInt(params.grace as string) || 5);
  const [lead, setLead] = React.useState(parseInt(params.lead as string) || 10);
  const [interval, setInterval] = React.useState(parseInt(params.interval as string) || 0);
  const [sound, setSound] = React.useState("Default");

  const [isSaving, setIsSaving] = React.useState(false);
  
  // ── Picker State ──
  const [picker, setPicker] = React.useState<{
    visible: boolean;
    title: string;
    options: SelectionOption[];
    selectedValue: any;
    onSelect: (value: any) => void;
  }>({
    visible: false,
    title: "",
    options: [],
    selectedValue: null,
    onSelect: () => {},
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log("[EditRule] Saving Rule:", { name, style, intensity, grace, lead, interval });
      setTimeout(() => {
        setIsSaving(false);
        router.back();
      }, 800);
    } catch (error) {
      console.error("[EditRule] Save failed:", error);
      setIsSaving(false);
    }
  };

  /** Schema for Protocol settings */
  const commitmentSettingsItems = React.useMemo(() => [
    {
      id: "showUp",
      title: "Just Show Up",
      type: "toggle" as const,
      value: style === "just_show_up",
      onValueChange: (v: boolean) => {
        if (v) setStyle("just_show_up");
      },
    },
    {
      id: "stayThroughout",
      title: "Stay Throughout",
      type: "toggle" as const,
      value: style === "stay_throughout",
      onValueChange: (v: boolean) => {
        if (v) setStyle("stay_throughout");
      },
    },
    {
      id: "intensity",
      title: "Check-In Intensity",
      type: "select" as const,
      disabled: style !== "stay_throughout",
      selectValue: style === "stay_throughout" 
        ? intensity.charAt(0).toUpperCase() + intensity.slice(1)
        : "N/A",
      onPress: () => {
        if (style !== "stay_throughout") return;
        setPicker({
          visible: true,
          title: "Check-in Intensity",
          options: SETTINGS_OPTIONS.intensity,
          selectedValue: intensity,
          onSelect: (v: any) => setIntensity(v),
        });
      }
    },
    {
      id: "maxMissedCheckins",
      title: "Max Missed Check-ins",
      type: "select" as const,
      disabled: style !== "stay_throughout",
      selectValue: style === "stay_throughout" ? `${maxMissed}` : "N/A",
      onPress: () => {
        if (style !== "stay_throughout") return;
        setPicker({
          visible: true,
          title: "Allowed Misses",
          options: SETTINGS_OPTIONS.maxMissedCheckins,
          selectedValue: maxMissed,
          onSelect: (v: any) => setMaxMissed(v),
        });
      }
    },
    {
      id: "grace",
      title: "Grace Period",
      type: "select" as const,
      selectValue: `${grace} mins`,
      onPress: () => setPicker({
        visible: true,
        title: "Grace Period",
        options: SETTINGS_OPTIONS.gracePeriod,
        selectedValue: grace,
        onSelect: (v: any) => setGrace(v),
      })
    }
  ], [style, intensity, maxMissed, grace]);

  /** Schema for Alarm settings */
  const alarmSettingsItems = React.useMemo(() => [
    {
      id: "alarmLeadTime",
      title: "Start Alarming",
      type: "select" as const,
      selectValue: `${lead} mins before`,
      onPress: () => setPicker({
        visible: true,
        title: "Start Alarming",
        options: SETTINGS_OPTIONS.alarmLeadTime,
        selectedValue: lead,
        onSelect: (v: any) => setLead(v),
      })
    },
    {
      id: "alarmInterval",
      title: "Alarm Frequency",
      type: "select" as const,
      selectValue: `Every ${interval} mins`,
      onPress: () => setPicker({
        visible: true,
        title: "Alarm Frequency",
        options: SETTINGS_OPTIONS.alarmInterval,
        selectedValue: interval,
        onSelect: (v: any) => setInterval(v),
      })
    },
    {
      id: "alarmSound",
      title: "Alarm Music",
      type: "select" as const,
      selectValue: sound,
      onPress: () => setPicker({
        visible: true,
        title: "Alarm Music",
        options: SETTINGS_OPTIONS.alarmSound,
        selectedValue: sound,
        onSelect: (v: any) => setSound(v),
      })
    }
  ], [lead, interval, sound]);

  /** Schema for Waiver settings */
  const waiverSettingsItems = React.useMemo(() => [
    {
      id: "waiverDeadline",
      title: "Waiver Deadline",
      type: "select" as const,
      selectValue: `${Math.floor(600 / 60)} hours`,
      onPress: () => {} // Placeholder
    },
    {
      id: "allowEarlyWaiver",
      title: "Allow Early Waiver",
      type: "toggle" as const,
      value: false,
      onValueChange: (v: boolean) => {} // Placeholder
    }
  ], []);

  return (
    <>
      <ActionScreenLayout
        className="bg-black"
        header={
          <View className="pt-16">
            <View className="px-4 pb-4 flex-row items-center justify-between">
              <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
                <MaterialCommunityIcons name="chevron-left" size={24} color="#666" />
              </TouchableOpacity>
              <HeaderTitle className="flex-1 text-center font-bold">Edit Rule</HeaderTitle>
              <View className="w-10" />
            </View>
          </View>
        }
        footer={
          <View className="px-4">
            <PrimaryButton 
              onPress={handleSave} 
              disabled={isSaving}
            >
              {isSaving ? "..." : "Save"}
            </PrimaryButton>
          </View>
        }
        scrollable={true}
        paddingHorizontal={0}
      >
        <View className="pt-8 px-4">
          <View className="mb-7 items-center">
            <MaterialCommunityIcons
              name="format-list-checks"
              size={75}
              color="#4FA0FF"
              className="mb-4"
            />
            <Input
              value={name}
              onChangeText={(t: string) => setName(t)}
              placeholder="Rule Name"
            />
          </View>

          {/* Section: Commitment Style */}
          <View className="mb-2">
              <HeaderTitle>Commitment Style</HeaderTitle>
          </View>
          <SettingsToggleCard
            className="mb-5"
            items={commitmentSettingsItems}
          />

          {/* Section: Alarms */}
          <View className="mt-2 mb-2">
              <HeaderTitle>Alarms</HeaderTitle>
          </View>
          <SettingsToggleCard
            className="mb-5"
            items={alarmSettingsItems}
          />

          {/* Section: Waiver Rules */}
          <View className="mt-2 mb-2">
              <HeaderTitle>Waiver Rules</HeaderTitle>
          </View>
          <SettingsToggleCard
            className="mb-12"
            items={waiverSettingsItems}
          />
        </View>
      </ActionScreenLayout>

      {/* Sheet: Selection Picker (Shared with final.tsx) */}
      <SelectionSheet
        visible={picker.visible}
        title={picker.title}
        options={picker.options}
        selectedValue={picker.selectedValue}
        onSelect={(v) => {
          picker.onSelect(v);
          setPicker((prev) => ({ ...prev, visible: false }));
        }}
        onClose={() => setPicker((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
}