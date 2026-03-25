import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, useWindowDimensions, View, Text, Switch, Image } from "react-native";
import { withUniwind } from "uniwind";
import type { Id } from "@commit/backend/convex/_generated/dataModel";
import { useFreshPhotoUrl } from "@/hooks/useFreshPhotoUrl";
import { AppListerModule, type InstalledApp } from "@/modules/app-lister-module";

import { ActionScreenLayout, AddButton, Input, PrimaryButton } from "@/components/ui";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { MiniConditionCard } from "@/components/ui/commits/MiniConditionCard";
import { CommitCard } from "@/components/ui/commits/DigitalCommitment";
import { SettingsToggleCard } from "@/components/ui/commits/SettingsToggleCard";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import { SelectionSheet, type SelectionOption } from "@/components/ui/modal/SelectionSheet";
import { HeaderTitle } from "@/components/ui/text";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";
import { validateTaskDraft } from "@/lib/validation/taskDraft";
import { useCommitTask } from "@/hooks/useCommitTask";
import type { TaskDraft, Condition as StoreCondition } from "@/stores/useTaskDraftStore";

/** Metadata for a device-installed application resolved from native */
interface ResolvedApp {
  id: string;
  name: string;
  icon?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styled Components
// ─────────────────────────────────────────────────────────────────────────────

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UText = withUniwind(Text);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Condition card configuration for the carousel */
interface ConditionConfig {
  id: string;
  icon: string;
  title: string;
  route?: string;
}

/** Result from create/update mutations */
interface MutationResult {
  success: boolean;
  taskId?: Id<"tasks">;
  instances?: Array<{
    _id: string;
    start: number;
    end: number;
    status: string;
    title: string;
    config: any;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

/** Modal state for error/confirmation dialogs */
interface ModalState {
  visible: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Available condition types that users can configure */
const CONDITION_CONFIGS: ConditionConfig[] = [
  { id: "time", icon: "clock-outline", title: "Time", route: "/(create-commit)/time-set" },
  { id: "location", icon: "map-marker-outline", title: "Location", route: "/(create-commit)/location-set" },
  { id: "partner", icon: "account-check-outline", title: "Partner", route: "/(create-commit)/partner-select" },
  { id: "picture", icon: "camera-outline", title: "Picture" },
  { id: "video", icon: "video-outline", title: "Video" },
] as const;

/** Layout constants for the condition card carousel */
const LAYOUT = {
  horizontalPadding: 16,
  cardGap: 8,
  visibleCards: 3.2,
} as const;

/** App color palette */
const COLORS = {
  primary: "#4FA0FF",
  danger: "#FF3B30",
  success: "#4CD964",
} as const;

/** Selection options for advanced settings */
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
  waiverDeadline: [
    { label: "1 hour", value: 60 },
    { label: "5 hours", value: 300 },
    { label: "10 hours", value: 600 },
    { label: "24 hours", value: 1440 },
    { label: "2 days", value: 2880 },
  ],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FinalScreen (`/app/(create-commit)/final.tsx`)
 * 
 * The final confirmation screen where a user validates and saves their new/modified Commitment.
 * 
 * ARCHITECTURE OVERVIEW (The "Triple-Write" Protocol):
 * This component is arguably the most critical junction in the app. It must ensure that 
 * a task is perfectly synchronized across three completely separate environments:
 * 
 * 1. The Cloud (Convex Backend):
 *    We first attempt to mutate the remote database. If this fails (e.g., no internet),
 *    the entire operation halts with a clean error message. 
 * 
 * 2. The Local Cache (Expo SQLite):
 *    If the Convex mutation succeeds, we immediately execute a raw SQL transaction to copy 
 *    the task and all generated future instances into the local device database (`useSQLiteContext`). 
 *    This allows the `/schedules` and `/commits` tabs to instantly re-render via local observers, 
 *    bypassing the network round-trip delay.
 * 
 * 3. The Native OS (Kotlin AlarmScheduler):
 *    Finally, the component triggers `scheduleNextAlarm()` which reaches across the React Native 
 *    JSI bridge. The native Android Kotlin module then digests the SQLite database and binds 
 *    the exact WakeLock PendingIntents to the OS hardware clock.
 */
export default function FinalScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  // ─────────────────────────────────────────────────────────────────────────
  // Store Selectors
  // ─────────────────────────────────────────────────────────────────────────

  const draft = useTaskDraftStore((state) => state.draft) as TaskDraft;
  const setTitle = useTaskDraftStore((state) => state.setTitle);
  const setLocation = useTaskDraftStore((state) => state.setLocation);
  const setAssignee = useTaskDraftStore((state) => state.setAssignee);
  const setDraft = useTaskDraftStore((state) => state.setDraft);
  const setConfig = useTaskDraftStore((state) => state.setConfig);


  // Mutations and DB handled by custom hook 
  const executeCommit = useCommitTask();

  // Native App Data
  const [allInstalledApps, setAllInstalledApps] = useState<InstalledApp[]>([]);
  const [isAppsLoading, setIsAppsLoading] = useState(true);

  useEffect(() => {
    async function fetchApps() {
      setIsAppsLoading(true);
      try {
        const apps = await AppListerModule.getInstalledApps();
        setAllInstalledApps(apps);
      } catch (err) {
        console.error("Failed to fetch installed apps:", err);
      } finally {
        setIsAppsLoading(false);
      }
    }
    fetchApps();
  }, []);

  /** Filter the entire device list to only those in the user's blocklist */
  const selectedAppsMetadata = useMemo(() => {
    const blockCondition = draft.conditions.find(
      (c) => c.metric_key === "digital_commitment"
    );
    const storeApps = (blockCondition?.target.value as { apps: string[] })?.apps || [];

    return storeApps
      .map((pkg) => {
        const app = allInstalledApps.find((a) => a.id === pkg);
        if (!app) return null;
        return {
          id: app.id,
          name: app.name,
          icon: app.iconBase64 || undefined,
        };
      })
      .filter(Boolean) as ResolvedApp[];
  }, [draft.conditions, allInstalledApps]);
  // ─────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────
  // Computed Values
  // ─────────────────────────────────────────────────────────────────────────

  /** Whether we're editing an existing task (vs creating new) */
  const isEditMode = Boolean(draft.id);

  /** Calculate card width for horizontal carousel */
  const cardWidth = useMemo(() => {
    const totalGaps = LAYOUT.cardGap * Math.floor(LAYOUT.visibleCards);
    return (screenWidth - LAYOUT.horizontalPadding * 2 - totalGaps) / LAYOUT.visibleCards;
  }, [screenWidth]);

  // ─────────────────────────────────────────────────────────────────────────
  // Modal State
  // ─────────────────────────────────────────────────────────────────────────

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [errorModal, setErrorModal] = useState<ModalState>({
    visible: false,
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);



  // Picker State
  const [picker, setPicker] = useState<{
    visible: boolean;
    title: string;
    options: SelectionOption[];
    selectedValue: any;
    onSelect: (val: any) => void;
  }>({
    visible: false,
    title: "",
    options: [],
    selectedValue: null,
    onSelect: () => {},
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Condition State Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if a specific condition type is currently selected/configured.
   */
  const isConditionSelected = useCallback(
    (conditionTitle: string): boolean => {
      switch (conditionTitle) {
        case "Time":
          return (draft.recurrence?.time_windows?.length ?? 0) > 0;
        case "Location":
          return draft.conditions.some((c: StoreCondition) => c.metric_key === "location");
        case "Partner":
          return Boolean(draft.assignee_id && draft.assignee_id !== draft.assigner_id);
        default:
          return false;
      }
    },
    [draft.recurrence?.time_windows, draft.conditions, draft.assignee_id, draft.assigner_id]
  );

  /**
   * Get the clear handler for a specific condition type.
   * Returns undefined if condition is not clearable or not selected.
   */
  const getClearHandler = useCallback(
    (conditionTitle: string): (() => void) | undefined => {
      if (!isConditionSelected(conditionTitle)) return undefined;

      switch (conditionTitle) {
        case "Time":
          return () =>
            setDraft({
              recurrence: { type: "once", interval: 1, time_windows: [] },
              time_window: { start_at: null, due_at: null },
            });
        case "Location":
          return () => setLocation(null);
        case "Partner":
          return () => setAssignee(null);
        default:
          return undefined;
      }
    },
    [isConditionSelected, setDraft, setLocation, setAssignee]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Form Submission
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Validate the draft and show confirmation modal if valid.
   */
  const handleCommitPress = useCallback(() => {
    const validation = validateTaskDraft(draft);

    if (!validation.valid) {
      setErrorModal({ visible: true, message: validation.error });
      return;
    }

    setConfirmModalVisible(true);
  }, [draft]);

  /**
   * Submit the task to the backend via the centralized Triple-Write Architecture
   */
  const submitTask = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Execute our entirely abstracted Custom Hook orchestrating the DB, Convex, and Android!
      const { success, error } = await executeCommit(draft, isEditMode);

      if (success) {
        console.log('[final.tsx] Total Transaction Success. Navigating to timeline view.');
        router.push("/(main)/commits");
      } else {
        setErrorModal({ 
           visible: true, 
           message: error || "Core logic failed unexpectedly." 
        });
      }
    } catch (generalError) {
      console.error("[final.tsx] Immediate runtime rejection:", generalError);
      setErrorModal({
        visible: true,
        message: "Network configuration totally failed. Attempt recovery."
      });
    } finally {
      setIsSubmitting(false);
      setConfirmModalVisible(false);
    }
  }, [draft, isEditMode, router]);

  // ─────────────────────────────────────────────────────────────────────────
  // Component View Configurations (Extracted for JSX Pristineness)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Represents the dynamic form schema for the "Commitment Type" section.
   * Handles toggle states and picker modal requests for Stay Throughout mode.
   */
  const commitmentSettingsItems = useMemo(() => [
    {
      id: "showUp",
      title: "Just Show Up",
      type: "toggle" as const,
      value: draft.config.verification_style === "just_show_up",
      onValueChange: (v: boolean) => {
        if (v) setConfig({ verification_style: "just_show_up" });
      },
    },
    {
      id: "stayThroughout",
      title: "Stay Throughout",
      type: "toggle" as const,
      value: draft.config.verification_style === "stay_throughout",
      onValueChange: (v: boolean) => {
        if (v) {
          setConfig({ 
            verification_style: "stay_throughout",
            stay_throughout_config: draft.config.stay_throughout_config || {
              intensity: "relaxed",
              max_missed_checkins: 1,
            }
          });
        }
      },
    },
    {
      id: "intensity",
      title: "Check-In Intensity",
      type: "select" as const,
      disabled: draft.config.verification_style !== "stay_throughout",
      selectValue: draft.config.verification_style === "stay_throughout" 
        ? (draft.config.stay_throughout_config?.intensity ? draft.config.stay_throughout_config.intensity.charAt(0).toUpperCase() + draft.config.stay_throughout_config.intensity.slice(1) : "Relaxed")
        : "N/A",
      onPress: () => {
        if (draft.config.verification_style !== "stay_throughout") return;
        setPicker({
          visible: true,
          title: "Check-in Intensity",
          options: SETTINGS_OPTIONS.intensity,
          selectedValue: draft.config.stay_throughout_config?.intensity ?? "relaxed",
          onSelect: (v) => setConfig({ 
            stay_throughout_config: { 
              ...(draft.config.stay_throughout_config || { max_missed_checkins: 1 }),
              intensity: v
            } 
          }),
        });
      }
    },
    {
      id: "maxMissedCheckins",
      title: "Max Missed Check-ins",
      type: "select" as const,
      disabled: draft.config.verification_style !== "stay_throughout",
      selectValue: draft.config.verification_style === "stay_throughout" 
        ? `${draft.config.stay_throughout_config?.max_missed_checkins ?? 1}`
        : "N/A",
      onPress: () => {
        if (draft.config.verification_style !== "stay_throughout") return;
        setPicker({
          visible: true,
          title: "Allowed Misses",
          options: SETTINGS_OPTIONS.maxMissedCheckins,
          selectedValue: draft.config.stay_throughout_config?.max_missed_checkins ?? 1,
          onSelect: (v) => setConfig({ 
            stay_throughout_config: {
              ...(draft.config.stay_throughout_config || { intensity: "relaxed" }),
              max_missed_checkins: v
            } 
          }),
        });
      }
    },
    {
      id: "grace",
      title: "Grace Period",
      type: "select" as const,
      selectValue: `${draft.config.grace_period_minutes} mins`,
      onPress: () => setPicker({
        visible: true,
        title: "Grace Period",
        options: SETTINGS_OPTIONS.gracePeriod,
        selectedValue: draft.config.grace_period_minutes,
        onSelect: (v) => setConfig({ grace_period_minutes: v }),
      })
    }
  ], [draft.config, setConfig]);

  /**
   * Represents the dynamic form schema for the "Alarms" section.
   */
  const alarmSettingsItems = useMemo(() => [
    {
      id: "alarmLeadTime",
      title: "Start Alarming",
      type: "select" as const,
      selectValue: `${draft.config.alarms.lead_time_minutes} mins before`,
      onPress: () => setPicker({
        visible: true,
        title: "Start Alarming",
        options: SETTINGS_OPTIONS.alarmLeadTime,
        selectedValue: draft.config.alarms.lead_time_minutes,
        onSelect: (v) => setConfig({ alarms: { lead_time_minutes: v } }),
      })
    },
    {
      id: "alarmInterval",
      title: "Alarm Frequency",
      type: "select" as const,
      selectValue: `Every ${draft.config.alarms.interval_minutes} mins`,
      onPress: () => setPicker({
        visible: true,
        title: "Alarm Frequency",
        options: SETTINGS_OPTIONS.alarmInterval,
        selectedValue: draft.config.alarms.interval_minutes,
        onSelect: (v) => setConfig({ alarms: { interval_minutes: v } }),
      })
    },
    {
      id: "alarmSound",
      title: "Alarm Music",
      type: "select" as const,
      selectValue: draft.config.alarms.sound_key,
      onPress: () => setPicker({
        visible: true,
        title: "Alarm Music",
        options: SETTINGS_OPTIONS.alarmSound,
        selectedValue: draft.config.alarms.sound_key,
        onSelect: (v) => setConfig({ alarms: { sound_key: v } }),
      })
    }
  ], [draft.config.alarms, setConfig]);

  /**
   * Represents the dynamic form schema for the "Waiver Settings" section.
   */
  const waiverSettingsItems = useMemo(() => [
    {
      id: "waiverDeadline",
      title: "Waiver Deadline",
      type: "select" as const,
      selectValue: draft.penalty_waiver?.deadline_minutes 
        ? (draft.penalty_waiver.deadline_minutes >= 1440 
          ? `${Math.floor(draft.penalty_waiver.deadline_minutes / 1440)} days` 
          : `${Math.floor(draft.penalty_waiver.deadline_minutes / 60)} hours`)
        : "Set deadline",
      onPress: () => setPicker({
        visible: true,
        title: "Waiver Deadline",
        options: SETTINGS_OPTIONS.waiverDeadline,
        selectedValue: draft.penalty_waiver?.deadline_minutes ?? 600,
        onSelect: (v) => setDraft({ 
          penalty_waiver: { 
            ...(draft.penalty_waiver || { type: "captcha", config: {} }), 
            deadline_minutes: v 
          } 
        }),
      })
    },
    {
      id: "allowEarlyWaiver",
      title: "Allow Early Waiver",
      type: "toggle" as const,
      value: draft.penalty_waiver?.config?.allow_early ?? false,
      onValueChange: (v: boolean) => setDraft({
        penalty_waiver: {
          ...(draft.penalty_waiver || { type: "captcha", config: {}, deadline_minutes: 600 }),
          config: {
            ...(draft.penalty_waiver?.config || {}),
            allow_early: v
          }
        }
      })
    }
  ], [draft.penalty_waiver, setDraft]);


  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <ActionScreenLayout
      paddingHorizontal={16}
      className="pt-20"
      footer={
        <PrimaryButton onPress={handleCommitPress} disabled={isSubmitting}>
          {isEditMode ? "Save" : "CommitT"}
        </PrimaryButton>
      }
    >
      {/* Header: Icon + Commitment Name */}
        {/* Header: Icon + Commitment Name */}
        <UView className="mb-7 items-center">
          <MaterialCommunityIcons
            name="book"
            size={75}
            color={COLORS.primary}
            style={{ marginBottom: 16 }}
          />
          <Input
            placeholder="Commitment Name"
            value={draft.title}
            onChangeText={setTitle}
          />
        </UView>

        {/* Section: Conditions */}
        <UView className="mb-1 flex-row items-center justify-between">
          <HeaderTitle>Conditions</HeaderTitle>
          <AddButton onPress={() => {}} />
        </UView>

        {/* Horizontal Condition Cards Carousel */}
        <UView>
          <UScroll horizontal showsHorizontalScrollIndicator={false} className="mb-1 flex-row py-3">
            {CONDITION_CONFIGS.map((config, index) => (
              <MiniConditionCard
                key={config.id}
                icon={config.icon}
                title={config.title}
                width={cardWidth}
                className={`h-20 ${index < CONDITION_CONFIGS.length - 1 ? "mr-2" : ""}`}
                selected={isConditionSelected(config.title)}
                selectionColor={COLORS.primary}
                onPress={() => config.route && router.push(config.route as any)}
                onClear={getClearHandler(config.title)}
              />
            ))}
          </UScroll>
        </UView>

        {/* Section: Digital Commitment */}
        <UView className="mb-3">
          <HeaderTitle>Digital Commitment</HeaderTitle>
        </UView>
        <CommitCard
          className="mb-5"
          apps={selectedAppsMetadata}
          isAppsLoading={isAppsLoading}
          selectedCount={
            (draft.conditions.find((c) => c.metric_key === "digital_commitment")
              ?.target.value as { apps: string[] })?.apps.length || 0
          }
          onPress={() => router.push("/(create-commit)/choose")}
        />



        {/* Section: Penalties */}
        <UView className="mt-2 mb-3">
          <HeaderTitle>Penalties</HeaderTitle>
        </UView>

        {(() => {
          const penalty = draft.penalty;
          const config = penalty?.config;

          let displayTitle = "Add Penalty";
          let displaySubtitle = "Set a consequence for failing your commitment";
          let displayIcon = "alert-circle-outline";

          if (penalty?.type === "money") {
            displayTitle = "Money Penalty";
            displaySubtitle = `₹${config?.amount || 500} will be deducted if you fail`;
            displayIcon = "currency-inr";
          } else if (penalty?.type === "embarrassing_photo") {
            displayTitle = "Embarrassing Photo";
            displaySubtitle = `Will be sent via ${config?.channel || "delivery channel"} to your chosen mail id `;
            displayIcon = "camera-enhance-outline";
          } else if (penalty?.type === "cringe_message") {
            displayTitle = "Cringe Message";
            displaySubtitle = "Shameful message will be sent to contact";
            displayIcon = "message-alert-outline";
          } else if (penalty?.type === "block_app") {
            displayTitle = "Block Favourite App";
            displaySubtitle = "Access to chosen app will be restricted";
            displayIcon = "cellphone-off";
          }

          return (
            <ConditionCard
              icon={displayIcon}
              iconColor={COLORS.danger}
              title={displayTitle}
              subtitle={displaySubtitle}
              onPress={() => router.push("/(create-commit)/penalties")}
              className="h-28 pb-4"
              selected={!!penalty}
              selectionColor={COLORS.danger}
              onClear={() => setDraft({ penalty: null })}
            />
          );
        })()}

        {/* Section: Penalty Waiver */}
        <UView className="mt-3 mb-3">
          <HeaderTitle>Penalty Waiver</HeaderTitle>
        </UView>

        {(() => {
          const waiver = draft.penalty_waiver;
          const config = waiver?.config;

          let displayTitle = "Choose a Penalty Waiver";
          let displaySubtitle = "Set a challenge to waive your consequence";
          let displayIcon = "check-decagram-outline";

          if (waiver?.type === "captcha") {
            displayTitle = "Solve CAPTCHAs";
            displaySubtitle = `Solve ${config?.count || 5} ${config?.difficulty || "medium"} noise captchas to waive off the penalty `;
            displayIcon = "shield-check-outline";
          } else if (waiver?.type === "paragraph") {
            displayTitle = "Write Paragraph";
            displaySubtitle = "Type the chosen text to earn a waiver";
            displayIcon = "pencil-outline";
          } else if (waiver?.type === "intense") {
            displayTitle = "Redo With Intensity";
            displaySubtitle = "Repeat the habit with increased difficulty";
            displayIcon = "fire";
          } else if (waiver?.type === "run") {
            displayTitle = "Run 5 KM";
            displaySubtitle = "Complete the workout to waive penalty";
            displayIcon = "run-fast";
          }

          return (
            <ConditionCard
              icon={displayIcon}
              iconColor={COLORS.success}
              title={displayTitle}
              subtitle={displaySubtitle}
              onPress={() => router.push("/(create-commit)/penaltywaivers")}
              className="h-28 pb-4"
              selected={!!waiver}
              selectionColor={COLORS.success}
              onClear={() => setDraft({ penalty_waiver: null })}
            />
          );
        })()}

        {/* Section: Commitment Type */}
        <UView className="mt-3 mb-2">
          <HeaderTitle>Commitment Type</HeaderTitle>
        </UView>

        <SettingsToggleCard
          className="mb-4"
          items={commitmentSettingsItems}
        />

        {/* Section: Alarms */}
        <UView className="mt-2 mb-2">
          <HeaderTitle>Alarms</HeaderTitle>
        </UView>

        <SettingsToggleCard
          className="mb-4"
          items={alarmSettingsItems}
        />

        {/* Section: Waiver Settings */}
        <UView className="mt-2 mb-2">
          <HeaderTitle>Waiver Rules</HeaderTitle>
        </UView>

        <SettingsToggleCard
          className="mb-6"
          items={waiverSettingsItems}
        />
        
    </ActionScreenLayout>

      {/* Modal: Commit Confirmation */}
      <ConfirmationModal
        visible={confirmModalVisible}
        title={isEditMode ? "Update this CommitT?" : "Create this CommitT?"}
        confirmText={isEditMode ? "Update" : "Commit"}
        cancelText="Cancel"
        confirmColor={COLORS.primary}
        cancelColor={COLORS.danger}
        onConfirm={submitTask}
        onCancel={() => setConfirmModalVisible(false)}
        isLoading={isSubmitting}
      />

      {/* Modal: Error Display */}
      <ConfirmationModal
        visible={errorModal.visible}
        title={errorModal.message}
        confirmText="Ok"
        singleButton={true}
        onConfirm={() => setErrorModal({ visible: false, message: "" })}
        onCancel={() => setErrorModal({ visible: false, message: "" })}
      />

      {/* Sheet: Selection Picker */}
      <SelectionSheet
        visible={picker.visible}
        title={picker.title}
        options={picker.options}
        selectedValue={picker.selectedValue}
        onSelect={picker.onSelect}
        onClose={() => setPicker((s) => ({ ...s, visible: false }))}
      />
    </>
  );
}
