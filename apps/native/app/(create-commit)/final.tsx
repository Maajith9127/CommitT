import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, useWindowDimensions, View, Text, Switch } from "react-native";
import { withUniwind } from "uniwind";
import { useMutation } from "convex/react";
import { useSQLiteContext } from "expo-sqlite";
import { api } from "@commit/backend/convex/_generated/api";
import type { Id } from "@commit/backend/convex/_generated/dataModel";

import { AddButton, Input, PrimaryButton } from "@/components/ui";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { MiniConditionCard } from "@/components/ui/commits/MiniConditionCard";
import { CommitCard } from "@/components/ui/commits/DigitalCommitment";
import { SettingsToggleCard } from "@/components/ui/commits/SettingsToggleCard";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import { SelectionSheet, type SelectionOption } from "@/components/ui/modal/SelectionSheet";
import { HeaderTitle } from "@/components/ui/text";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";
import { validateTaskDraft } from "@/lib/validation/taskDraft";
import { scheduleNextAlarm } from "@/modules/scheduler-module";
import type { TaskDraft, Condition as StoreCondition } from "@/stores/useTaskDraftStore";

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
  checkinsPerHour: [
    { label: "1 Random Check-in / hr", value: 1 },
    { label: "2 Random Check-ins / hr", value: 2 },
    { label: "4 Random Check-ins / hr", value: 4 },
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


  // Local DB
  const db = useSQLiteContext();

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────

  const createTask = useMutation(api.api.commitments.create.default);
  const updateTask = useMutation(api.api.commitments.update.default);

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
   * Handle the mutation result and navigate or show error accordingly.
   */
  const handleMutationResult = useCallback(
    (result: MutationResult) => {
      if (result.success) {
        router.push("/(main)/commits");
      } else {
        const errorMessage = result.error?.message ?? "Failed to save commitment. Please try again.";
        setErrorModal({ visible: true, message: errorMessage });
      }
    },
    [router]
  );

  /**
   * Submit the task to the backend (create or update).
   */
  const submitTask = useCallback(async () => {
    setConfirmModalVisible(false);

    // Strip local 'id' field from conditions (not part of backend schema)
    const cleanedConditions = draft.conditions.map((condition: StoreCondition) => {
      const { id, ...conditionData } = condition;
      return conditionData;
    });

    const now = Date.now();

    try {
      let result: MutationResult;

      if (isEditMode) {
        // ── UPDATE: Convex first, then local DB ──────────────────────────
        result = await updateTask({
          id: draft.id as Id<"tasks">,
          title: draft.title,
          description: draft.description,
          visibility: draft.visibility,
          recurrence: draft.recurrence,
          conditions: cleanedConditions,
          config: draft.config,
        });

        if (result.success) {
          try {
            await db.runAsync(
              `UPDATE local_tasks SET
                title = ?, description = ?, visibility = ?,
                recurrence_json = ?, conditions_json = ?, config_json = ?,
                updated_at = ?, synced_at = ?
              WHERE convex_id = ?`,
              [
                draft.title,
                draft.description,
                draft.visibility,
                JSON.stringify(draft.recurrence),
                JSON.stringify(cleanedConditions),
                JSON.stringify(draft.config),
                now,
                now,
                draft.id as string,
              ]
            );
            console.log('[submitTask] Local DB updated for task:', draft.id);

            // Re-generate and insert task instances based on new recurrence rules
            const taskRow = await db.getFirstAsync<{ id: string }>(
              "SELECT id FROM local_tasks WHERE convex_id = ?",
              [draft.id as string]
            );

            if (taskRow) {
              const localTaskId = taskRow.id;
              // Clear previous instances
              await db.runAsync("DELETE FROM task_instances WHERE task_id = ?", [localTaskId]);

              const backendInstances = result.instances || [];
              if (backendInstances.length > 0) {
                const statement = await db.prepareAsync(
                  `INSERT INTO task_instances (id, task_id, convex_id, scheduled_timestamp, start_time, end_time, title, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
                );
                try {
                  for (const instance of backendInstances) {
                    const instanceId = `inst_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
                    await statement.executeAsync([
                      instanceId,
                      localTaskId,
                      instance._id,
                      instance.start,
                      instance.start,
                      instance.end,
                      instance.title,
                      JSON.stringify(instance.config),
                      now
                    ]);
                  }
                  console.log(`[submitTask] Inserted ${backendInstances.length} future instances from Convex for update.`);
                } finally {
                  await statement.finalizeAsync();
                }
              }
            }

            // Schedule globally next alarm via native module
            try {
              const scheduleResult = scheduleNextAlarm();
              console.log('[submitTask] Schedule result:', JSON.stringify(scheduleResult));
            } catch (schedError) {
              console.error('[submitTask] Scheduling failed (non-critical):', schedError);
            }
          } catch (localError) {
            console.error('[submitTask] Local DB update failed (non-critical):', localError);
            // Update succeeded on Convex — local DB will re-sync on next app open
          }
        }
      } else {
        // ── CREATE: Convex first, then local DB ──────────────────────────
        result = await createTask({
          assignee_id: draft.assignee_id,
          title: draft.title,
          description: draft.description,
          visibility: draft.visibility,
          recurrence: draft.recurrence,
          conditions: cleanedConditions,
          config: draft.config,
        });

        if (result.success && result.taskId) {
          const localId = `local_${now}_${Math.random().toString(36).slice(2, 9)}`;
          try {
            await db.runAsync(
              `INSERT INTO local_tasks
                (id, convex_id, assigner_id, assignee_id, title, description,
                 visibility, recurrence_json, conditions_json, config_json, created_at, updated_at, synced_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                localId,
                result.taskId,
                draft.assigner_id,
                draft.assignee_id,
                draft.title,
                draft.description,
                draft.visibility,
                JSON.stringify(draft.recurrence),
                JSON.stringify(cleanedConditions),
                JSON.stringify(draft.config),
                now,
                now,
                now,
              ]
            );
            console.log('[submitTask] Local DB insert OK. convex_id:', result.taskId);

            // Generate and insert task instances
            const backendInstances = result.instances || [];
            if (backendInstances.length > 0) {
              const statement = await db.prepareAsync(
                `INSERT INTO task_instances (id, task_id, convex_id, scheduled_timestamp, start_time, end_time, title, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
              );
              try {
                for (const instance of backendInstances) {
                  const instanceId = `inst_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
                  await statement.executeAsync([
                    instanceId,
                    localId,
                    instance._id,
                    instance.start,
                    instance.start,
                    instance.end,
                    instance.title,
                    JSON.stringify(instance.config),
                    now,
                  ]);
                }
                console.log(`[submitTask] Inserted ${backendInstances.length} future instances from Convex for creation.`);
              } finally {
                await statement.finalizeAsync();
              }
            }

            // Schedule globally next alarm via native module
            try {
              const scheduleResult = scheduleNextAlarm();
              console.log('[submitTask] Schedule result:', JSON.stringify(scheduleResult));
            } catch (schedError) {
              console.error('[submitTask] Scheduling failed (non-critical):', schedError);
            }
          } catch (localError) {
            console.error('[submitTask] Local DB insert failed (non-critical):', localError);
            // Create succeeded on Convex — local DB will re-sync on next app open
          }
        }
      }

      handleMutationResult(result);
    } catch (error) {
      console.error("[submitTask] Error:", error);
      const message = error instanceof Error 
        ? error.message 
        : "Something went wrong. Please check your connection and try again.";
      
      setErrorModal({
        visible: true,
        message: message.includes("Unauthenticated") 
          ? "Please log in to continue." 
          : "Network error. Please check your connection.",
      });
    }
  }, [draft, isEditMode, createTask, updateTask, handleMutationResult, db]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <UView className="flex-1 bg-black px-4 pt-20">
      {/* Main Scroll Area */}
      <UScroll showsVerticalScrollIndicator={false} className="flex-1">
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
        <CommitCard className="mb-5" onPress={() => router.push("/(create-commit)/choose")} />



        {/* Section: Penalties */}
        <UView className="mt-2 mb-3">
          <HeaderTitle>Penalties</HeaderTitle>
        </UView>
        <ConditionCard
          icon="alert-circle-outline"
          iconColor={COLORS.danger}
          title="Penalty"
          subtitle="₹500 will be deducted if you miss this commitment"
          onPress={() => router.push("/(create-commit)/penalties")}
          className="h-28 border-[3px] border-red-500 pb-4"
        />

        {/* Section: Penalty Waiver */}
        <UView className="mt-3 mb-3">
          <HeaderTitle>Penalty Waiver</HeaderTitle>
        </UView>
        <ConditionCard
          icon="check-decagram-outline"
          iconColor={COLORS.success}
          title="Penalty Waiver"
          subtitle="Solve 100 CAPTCHAs to waive the penalty"
          onPress={() => router.push("/(create-commit)/penaltywaivers")}
          className="h-28 border-[#4CD964] border-[3px] pb-4"
        />

        {/* Section: Commitment Type */}
        <UView className="mt-3 mb-2">
          <HeaderTitle>Commitment Type</HeaderTitle>
        </UView>

        <SettingsToggleCard
          className="mb-4"
          items={[
            {
              id: "showUp",
              title: "Just Show Up",
              type: "toggle",
              value: draft.config.verification_style === "just_show_up",
              onValueChange: (v) => {
                if (v) setConfig({ verification_style: "just_show_up" });
              },
            },
            {
              id: "stayThroughout",
              title: "Stay Throughout",
              type: "toggle",
              value: draft.config.verification_style === "stay_throughout",
              onValueChange: (v) => {
                if (v) setConfig({ verification_style: "stay_throughout" });
              },
            },
            {
              id: "checkinsPerHour",
              title: "Check-In",
              type: "select" as const,
              disabled: draft.config.verification_style !== "stay_throughout",
              selectValue: draft.config.verification_style === "stay_throughout" 
                // @ts-ignore
                ? `${draft.config.stay_throughout_config?.checkins_per_hour ?? 2} / hr`
                : "N/A",
              onPress: () => {
                if (draft.config.verification_style !== "stay_throughout") return;
                setPicker({
                  visible: true,
                  title: "Check-ins per hour",
                  options: SETTINGS_OPTIONS.checkinsPerHour,
                  // @ts-ignore
                  selectedValue: draft.config.stay_throughout_config?.checkins_per_hour ?? 2,
                  onSelect: (v) => setConfig({ 
                    // @ts-ignore
                    stay_throughout_config: { 
                      checkins_per_hour: v,
                      max_missed_checkins: 1 // Default
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
          ]}
        />

        {/* Section: Alarms */}
        <UView className="mt-2 mb-2">
          <HeaderTitle>Alarms</HeaderTitle>
        </UView>

        <SettingsToggleCard
          className="mb-6"
          items={[
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
          ]}
        />
        
      </UScroll>

      {/* Fixed Footer: Submit Button */}
      <UView className="mb-10">
        <PrimaryButton onPress={handleCommitPress}>
          {isEditMode ? "Save" : "CommitT"}
        </PrimaryButton>
      </UView>

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
    </UView>
  );
}
