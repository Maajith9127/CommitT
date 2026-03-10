import React, { useState, useMemo } from "react";
import { View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { withUniwind } from "uniwind";

import { 
  ActionScreenLayout, 
  HeaderTitle, 
  AuthTitle, 
  PrimaryButton, 
} from "@/components/ui";
import { SettingsToggleCard } from "@/components/ui/commits/SettingsToggleCard";
import { SelectionSheet } from "@/components/ui/modal/SelectionSheet";

const UView = withUniwind(View);

const DURATION_OPTIONS = [
  { label: "3 Days", value: "3" },
  { label: "5 Days", value: "5" },
  { label: "7 Days", value: "7" },
  { label: "14 Days", value: "14" },
  { label: "30 Days", value: "30" },
];

/**
 * StrictModeSetupScreen
 * 
 * Arranged following the unified 'ActionScreen' pattern.
 * Provides a high-stakes confirmation flow for locking tasks in the Steel Vault.
 */
export default function StrictModeSetupScreen() {
  const router = useRouter();
  const { taskId, title } = useLocalSearchParams<{ taskId: string; title: string }>();
  const [isActivating, setIsActivating] = useState(false);
  
  const [duration, setDuration] = useState("1");
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleActivate = async () => {
    setIsActivating(true);
    console.log("[STRICT_MODE] Activation triggered for:", taskId, "Duration:", duration);
    // Logic for backend activation would go here
    setTimeout(() => {
      setIsActivating(false);
      router.back();
    }, 800);
  };

  const durationItems = useMemo(() => [
    {
      id: "1day",
      title: "1 Day",
      type: "select" as const,
      selectValue: duration === "1" ? "✓" : "",
      onPress: () => setDuration("1"),
    },
    {
      id: "2days",
      title: "2 Days",
      type: "select" as const,
      selectValue: duration === "2" ? "✓" : "",
      onPress: () => setDuration("2"),
    },
    {
      id: "custom",
      title: "Custom",
      type: "select" as const,
      selectValue: (duration !== "1" && duration !== "2") 
        ? (DURATION_OPTIONS.find(o => o.value === duration)?.label || "Select")
        : "Select",
      onPress: () => setPickerVisible(true),
    }
  ], [duration]);

  return (
    <>
      <ActionScreenLayout
        paddingHorizontal={16}
        className="bg-black pt-20"
        footer={
          <UView>
            <PrimaryButton 
              onPress={handleActivate}
              disabled={isActivating}
            >
              {isActivating ? "Locking..." : "Activate Strict Mode"}
            </PrimaryButton>
          </UView>
        }
      >
        {/* 1. HEADER SECTION (Arrangement matching penaltywaiver) */}
        <View className="mb-8">
          <HeaderTitle className="text-3xl text-[#4FA0FF]">Strict Mode</HeaderTitle>
          <AuthTitle className="mt-1 mb-0 text-left text-gray-400">
            Locking <AuthTitle className="text-white font-bold">"{title || 'this task'}"</AuthTitle> makes it immutable across all future instances till choosen.
          </AuthTitle>
        </View>

        {/* 2. SETTINGS SECTION: Using the standard SettingsToggleCard */}
        <UView className="mt-4 mb-2">
           <HeaderTitle>Lock Duration</HeaderTitle>
        </UView>
        <SettingsToggleCard items={durationItems} />
      </ActionScreenLayout>

      {/* 3. SELECTION PICKER: For custom duration options */}
      <SelectionSheet 
        visible={pickerVisible}
        title="Custom Duration"
        options={DURATION_OPTIONS}
        selectedValue={duration}
        onSelect={setDuration}
        onClose={() => setPickerVisible(false)}
      />
    </>
  );
}
