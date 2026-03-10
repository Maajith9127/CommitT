import React, { useState, useMemo, useEffect } from "react";
import { View, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { withUniwind } from "uniwind";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { api } from "@commit/backend/convex/_generated/api";
import { Id } from "@commit/backend/convex/_generated/dataModel";

import { 
  ActionScreenLayout, 
  HeaderTitle, 
  AuthTitle, 
  PrimaryButton, 
} from "@/components/ui";
import { SettingsToggleCard } from "@/components/ui/commits/SettingsToggleCard";
import { SelectionSheet } from "@/components/ui/modal/SelectionSheet";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { ConditionCardSkeleton } from "@/components/ui/skeletons/ConditionCardSkeleton";
import { useTaskStore } from "@/stores/useTaskStore";

const UView = withUniwind(View);

/**
 * [STEEL VAULT] Duration Presets 
 * 
 * We offer a range of commitment durations. Standardizing these ensures 
 * predictable backend enforcement and a clean selection UI.
 */
const DURATION_OPTIONS = [
  { label: "3 Days", value: "3" },
  { label: "5 Days", value: "5" },
  { label: "7 Days", value: "7" },
  { label: "14 Days", value: "14" },
  { label: "30 Days", value: "30" },
];

/**
 * StrictModeSetupScreen
 * ─────────────────────────────────────────────────────────────────────────────
 * The mission-critical configuration interface for "locking" a commitment.
 * 
 * DESIGN PRINCIPLES:
 * 1. Immersive: Pure black background and high-impact blue branding.
 * 2. High Stakes: Clear messaging about the immutable nature of the action.
 * 3. Reactive: Reflects real-time backend state using Convex queries.
 * 
 * BACKEND SYNC:
 * This screen interacts with the `activateStrictMode` engine in Convex,
 * which retroactively locks all future task instances.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function StrictModeSetupScreen() {
  const router = useRouter();
  
  // 1. DATA ACQUISITION & MUTATION
  const { taskId, title } = useLocalSearchParams<{ taskId: string; title: string }>();
  const id = taskId as Id<"tasks">;
  
  // OPTIVAC SYNC: Pull straight from Zustand store (already populated by useTasks on the previous screen)
  // This eliminates the Convex loading state and makes the UI toggle feel instant.
  const task = useTaskStore((state: any) => state.tasks.find((t: any) => t._id === id));
  const activateStrictMode = useMutation(api.api.commitments.strict_mode.default);

  const [isActivating, setIsActivating] = useState(false);
  const [duration, setDuration] = useState("1");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");

  // 1.5 Sync duration from backend if already set
  useEffect(() => {
    if (task?.strict_duration_days) {
      setDuration(String(task.strict_duration_days));
    }
  }, [task?.strict_duration_days]);

  // 2. VAULT ACTIVATION logic
  const handleActivatePress = () => {
    setConfirmVisible(true);
  };

  const executeLock = async () => {
    setConfirmVisible(false);
    setIsActivating(true);
    
    console.log(`[STRICT_MODE:UI] Initiating activation for Task: ${taskId}, Duration: ${duration} days`);

    try {
      const result = await activateStrictMode({
        id,
        durationDays: Number(duration),
      });

      if (result.success) {
        console.log("[STRICT_MODE:UI] Vault sealed successfully:", result);
        setSuccessVisible(true);
      } else if (result.error === "ALREADY_LOCKED") {
        console.log("[STRICT_MODE:UI] Task already locked, showing specific modal.");
        setErrorTitle("Already Sealed in Vault");
        setErrorVisible(true);
      } else {
        // Fallback for other logical rejections
        Alert.alert("Activation Rejected", result.message || "The Steel Vault could not be sealed at this time.");
      }
    } catch (err: any) {
      console.error("[STRICT_MODE:UI] Activation failed (System Error):", err);
      Alert.alert("Service Error", "There was a problem connecting to the vault. Please try again.");
    } finally {
      setIsActivating(false);
    }
  };

  const handleSuccessConfirm = () => {
    setSuccessVisible(false);
    router.replace("/(create-commit)/final");
  };

  /**
   * Represents the dynamic form schema for the lock options.
   * Leverages the unified SettingsToggleCard pattern for UX consistency.
   */
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

  // Derived state for existing locks
  const isCurrentlyLocked = task?.strict_until && Date.now() < task.strict_until;
  const currentExpiryDate = task?.strict_until ? new Date(task.strict_until).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : null;
  
  // Calculate target expiry date for the confirmation message
  const targetExpiryTimestamp = Date.now() + (Number(duration) * 24 * 60 * 60 * 1000);
  const targetExpiryString = new Date(targetExpiryTimestamp).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <>
      <ActionScreenLayout
        paddingHorizontal={16}
        className="bg-black pt-20"
        footer={
          <UView>
            <PrimaryButton 
              onPress={handleActivatePress}
              disabled={isActivating}
            >
              {isActivating ? "Sealing Vault..." : "Activate Strict Mode"}
            </PrimaryButton>
          </UView>
        }
      >
        {/* 1. HEADER SECTION */}
        <View className="mb-8">
          <HeaderTitle className="text-3xl text-[#4FA0FF]">Strict Mode</HeaderTitle>
          <AuthTitle className="mt-1 mb-0 text-left text-gray-400">
            Locking <AuthTitle className="text-white font-bold">"{title || task?.title || 'this task'}"</AuthTitle> makes it immutable across all future instances till chosen duration.
          </AuthTitle>

          {/* 
            HIDRATION STATE — [STEEL VAULT] 
            We use a skeleton placeholder to maintain layout stability while 
            Convex hydrates the task data. Once loaded, we fade into the 
            actual vault status if active.
          */}
          {task === undefined ? (
            <Animated.View entering={FadeIn} exiting={FadeOut} className="mt-8">
              <ConditionCardSkeleton />
            </Animated.View>
          ) : isCurrentlyLocked ? (
            <Animated.View entering={FadeIn} exiting={FadeOut} className="mt-8">
              <ConditionCard 
                icon="lock"
                title="VAULT ACTIVE"
                subtitle={`Locked until ${currentExpiryDate}`}
                selected={true}
                selectionColor="#4FA0FF"
              />
            </Animated.View>
          ) : null}
        </View>

        {/* 2. CONFIGURATION SECTION - Always visible per user request */}
        <UView className="mt-4 mb-2">
           <HeaderTitle>Lock Duration</HeaderTitle>
        </UView>
        <SettingsToggleCard items={durationItems} />
      </ActionScreenLayout>

      {/* 3. SELECTION PICKER: For custom durations */}
      <SelectionSheet 
        visible={pickerVisible}
        title="Custom Duration"
        options={DURATION_OPTIONS}
        selectedValue={duration}
        onSelect={setDuration}
        onClose={() => setPickerVisible(false)}
      />

      {/* 4. CONFIRMATION MODAL: The last line of defense */}
      <ConfirmationModal
        visible={confirmVisible}
        title={`Lock until ${targetExpiryString}?`}
        confirmText="Seal Vault"
        cancelText="Cancel"
        cancelColor="#FF3B30"
        onConfirm={executeLock}
        onCancel={() => setConfirmVisible(false)}
        isLoading={isActivating}
      />

      {/* 5. SUCCESS MODAL */}
      <ConfirmationModal
        visible={successVisible}
        title="Vault Sealed Successfully"
        confirmText="Done"
        onConfirm={() => {
          setSuccessVisible(false);
          router.replace("/(create-commit)/final");
        }}
        onCancel={() => setSuccessVisible(false)}
        singleButton={true}
      />

      <ConfirmationModal
        visible={errorVisible}
        title={errorTitle}
        confirmText="OK"
        onConfirm={() => setErrorVisible(false)}
        onCancel={() => setErrorVisible(false)}
        singleButton={true}
      />
    </>
  );
}
