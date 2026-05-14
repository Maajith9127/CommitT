import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, useWindowDimensions, View, Text, Image } from "react-native";
import { withUniwind } from "uniwind";
import type { Id } from "@commit/backend/convex/_generated/dataModel";
import { useAppStore } from "@/stores/useAppStore";

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
import { useAccountabilityPrefill } from "@/hooks/useAccountabilityPrefill";
import { usePermissions } from "@/hooks/usePermissions";
import type { TaskDraft, Condition as StoreCondition } from "@/stores/useTaskDraftStore";

/**
 * ── Extracted Domain Modules ──
 * Constants, types, settings schema builder, and display resolvers
 * are co-located in `_lib/` (excluded from Expo Router via underscore prefix).
 */
import { CONDITION_CONFIGS, LAYOUT, type ResolvedApp, type ModalState } from "./_lib/constants";
import { THEME } from "@/constants/theme";
import { useSettingsItems } from "./_lib/useSettingsItems";
import { getPenaltyDisplay, getWaiverDisplay } from "./_lib/displayHelpers";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Styled Primitives
 * ─────────────────────────────────────────────────────────────────────────────
 * Uniwind-wrapped base components used throughout the FinalScreen layout.
 * Declared at module scope to avoid re-creation on every render cycle.
 */
const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UText = withUniwind(Text);

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FinalScreen — Commitment Confirmation & Submission
 * ─────────────────────────────────────────────────────────────────────────────
 * Route: `/app/(create-commit)/final.tsx`
 * 
 * The terminal screen in the commitment creation flow. The user reviews their
 * fully-configured draft (conditions, penalties, waivers, alarms) and submits
 * it to the backend.
 * 
 * ARCHITECTURE — The "Triple-Write" Protocol:
 * This component orchestrates the most critical data path in the app. A single
 * "Commit" press must atomically synchronize across three isolated environments:
 * 
 *   1. CLOUD (Convex Backend)
 *      The remote mutation is attempted first. If it fails (e.g., no network),
 *      the entire operation halts with a clean, user-facing error modal.
 * 
 *   2. LOCAL CACHE (Expo SQLite)
 *      On Convex success, a raw SQL transaction writes the task and all generated
 *      future instances to the on-device database. This powers instant re-renders
 *      on the `/schedules` and `/commits` tabs without a network round-trip.
 * 
 *   3. NATIVE OS (Kotlin AlarmScheduler)
 *      Finally, `scheduleNextAlarm()` fires across the React Native JSI bridge.
 *      The Kotlin module digests the SQLite state and binds WakeLock-backed
 *      PendingIntents to the hardware alarm clock.
 * 
 * FAILURE SEMANTICS:
 * Each layer is gated behind the previous. A failure at any stage produces a
 * deterministic rollback path logged via the Saga pattern (see `useCommitTask`).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function FinalScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  /**
   * ── Store Selectors & External Hooks ──────────────────────────────────────
   * All Zustand selectors are individually subscribed to minimize re-renders.
   * Each selector returns a stable reference unless its specific slice changes.
   */

  /**
   * Accountability Prefill ("The Smart Handshake")
   * Fetches the user's historical penalty/waiver configuration from the backend
   * so that new commitments are "pre-armed" with their personal accountability
   * preferences. Runs once on mount, no-ops on subsequent renders.
   */
  useAccountabilityPrefill();

  const draft = useTaskDraftStore((state) => state.draft) as TaskDraft;
  const setTitle = useTaskDraftStore((state) => state.setTitle);
  const setLocation = useTaskDraftStore((state) => state.setLocation);
  const setAssignee = useTaskDraftStore((state) => state.setAssignee);
  const setDraft = useTaskDraftStore((state) => state.setDraft);
  const setConfig = useTaskDraftStore((state) => state.setConfig);

  /** Hardware Permission Manifest — gates submission behind full enforcer readiness */
  const { permissions } = usePermissions();

  /** Centralized mutation executor (Cloud → SQLite → Kotlin triple-write) */
  const executeCommit = useCommitTask();

  /**
   * ── App Discovery Data ────────────────────────────────────────────────────
   * Resolves the user's digital blocklist package names into display-ready
   * metadata (app name, icon URI) by cross-referencing the native app store.
   */
  const allInstalledApps = useAppStore((s) => s.apps);

  /**
   * Filters the full device app inventory down to only those packages present
   * in the user's configured digital commitment blocklist.
   */
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
          icon: app.iconUri || undefined,
        };
      })
      .filter(Boolean) as ResolvedApp[];
  }, [draft.conditions, allInstalledApps]);

  /**
   * ── Computed Values ───────────────────────────────────────────────────────
   */

  /** Determines create vs. edit mode based on whether the draft has a persisted ID */
  const isEditMode = Boolean(draft.id);

  /** Responsive card width for the horizontal condition carousel */
  const cardWidth = useMemo(() => {
    const totalGaps = LAYOUT.cardGap * Math.floor(LAYOUT.visibleCards);
    return (screenWidth - LAYOUT.horizontalPadding * 2 - totalGaps) / LAYOUT.visibleCards;
  }, [screenWidth]);

  /**
   * ── Modal & Picker State ──────────────────────────────────────────────────
   * Centralized state for the confirmation dialog, error dialog, and the
   * reusable bottom-sheet selection picker used by all settings rows.
   */

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [errorModal, setErrorModal] = useState<ModalState>({
    visible: false,
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  /**
   * ── Condition State Helpers ───────────────────────────────────────────────
   * Utility callbacks that bridge the condition carousel UI with the Zustand
   * draft store. These are memoized to preserve referential identity for
   * the MiniConditionCard `onPress` and `onClear` props.
   */

  /**
   * Determines whether a given condition type is currently active in the draft.
   * 
   * DESIGN NOTE: This checks only the ROOT-level draft state to drive the
   * carousel's visual selection indicator. Granular per-slot condition coverage
   * is validated separately by `validateTaskDraft()` at submission time.
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
        case "Picture":
          return draft.conditions.some((c: StoreCondition) => c.metric_key === "picture");
        case "Video":
          return draft.conditions.some((c: StoreCondition) => c.metric_key === "video");
        default:
          return false;
      }
    },
    [draft.recurrence?.time_windows, draft.conditions, draft.assignee_id, draft.assigner_id]
  );

  /**
   * Returns a teardown callback for the given condition type, or `undefined`
   * if the condition is not currently active (hides the clear button).
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

  /**
   * ── Form Submission Pipeline ──────────────────────────────────────────────
   * Two-phase commit: validate → confirm → execute.
   * Phase 1 (`handleCommitPress`): Permission gate + draft validation.
   * Phase 2 (`submitTask`): Triple-write execution via `useCommitTask`.
   */

  /**
   * Phase 1: Pre-flight checks before showing the confirmation modal.
   * 
   * SECURITY MODEL (Fail-Closed):
   * All seven hardware enforcers must be granted before a binding commitment
   * can be created. If any are missing, the user is redirected to the
   * permissions audit screen — the commit button becomes a dead end.
   */
  const handleCommitPress = useCallback(() => {
    const isReady =
      permissions.location &&
      permissions.notifications &&
      permissions.alarms &&
      permissions.overlay &&
      permissions.accessibility &&
      permissions.battery &&
      permissions.admin;

    if (!isReady) {
       console.warn("[final.tsx] Hardware Gate Intervention: Redirecting to permissions audit.");
       router.push("/(settings)/permissions");
       return;
    }

    const validation = validateTaskDraft(draft);

    if (!validation.valid) {
      setErrorModal({ visible: true, message: validation.error });
      return;
    }

    setConfirmModalVisible(true);
  }, [draft, permissions, router]);

  /**
   * Phase 2: Execute the Triple-Write Protocol.
   * Delegates entirely to the `useCommitTask` hook which owns the
   * Saga-based Cloud → SQLite → Kotlin synchronization sequence.
   */
  const submitTask = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const { success, error } = await executeCommit(draft, isEditMode);

      if (success) {
        console.log('[final.tsx] Total Transaction Success. Floating back to dashboard.');
        router.back();
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

  /**
   * ── Derived Data ──────────────────────────────────────────────────────────
   * Settings form schemas and display metadata are computed from the draft
   * via extracted modules. These are called here (not in JSX) to keep the
   * render tree purely declarative.
   */

  const { commitmentSettingsItems, alarmSettingsItems, waiverSettingsItems } = 
    useSettingsItems(draft, setConfig, setDraft, setPicker);

  const penaltyDisplay = getPenaltyDisplay(draft);
  const waiverDisplay = getWaiverDisplay(draft);

  /**
   * ── Render ────────────────────────────────────────────────────────────────
   * The JSX below is strictly declarative — all business logic, form schemas,
   * and display resolution happen above this line. Each visual section is
   * annotated with its purpose for rapid navigation.
   */
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
        {/* ── Header: Icon + Commitment Name ── */}
        <UView className="mb-7 items-center">
          <MaterialCommunityIcons
            name="book"
            size={75}
            color={THEME.colors.primary}
            style={{ marginBottom: 16 }}
          />
          <Input
            placeholder="Commitment Name"
            value={draft.title}
            onChangeText={setTitle}
          />
        </UView>

        {/* ── Section: Condition Carousel ── */}
        <UView className="mb-1 flex-row items-center justify-between">
          <HeaderTitle>Conditions</HeaderTitle>
          <AddButton onPress={() => {}} />
        </UView>

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
                selectionColor={THEME.colors.primary}
                onPress={() => config.route && router.push(config.route as any)}
                onClear={getClearHandler(config.title)}
              />
            ))}
          </UScroll>
        </UView>

        {/* ── Section: Digital Commitment (App Blocklist) ── */}
        <UView className="mb-3">
          <HeaderTitle>Digital Commitment</HeaderTitle>
        </UView>
        <CommitCard
          className="mb-5"
          apps={selectedAppsMetadata}
          isAppsLoading={allInstalledApps.length === 0}
          selectedCount={
            (draft.conditions.find((c) => c.metric_key === "digital_commitment")
              ?.target.value as { apps: string[] })?.apps.length || 0
          }
          onPress={() => router.push("/(create-commit)/choose")}
        />

        {/* ── Section: Penalty Configuration ── */}
        <UView className="mt-2 mb-3">
          <HeaderTitle>Penalties</HeaderTitle>
        </UView>

        <ConditionCard
          icon={penaltyDisplay.icon}
          iconColor={THEME.colors.danger}
          title={penaltyDisplay.title}
          subtitle={penaltyDisplay.subtitle}
          onPress={() => router.push("/(create-commit)/penalties")}
          className="h-28 pb-4"
          selected={!!draft.penalty}
          selectionColor={THEME.colors.danger}
          onClear={() => setDraft({ penalty: null })}
        />

        {/* ── Section: Penalty Waiver Configuration ── */}
        <UView className="mt-3 mb-3">
          <HeaderTitle>Penalty Waiver</HeaderTitle>
        </UView>

        <ConditionCard
          icon={waiverDisplay.icon}
          iconColor={THEME.colors.success}
          title={waiverDisplay.title}
          subtitle={waiverDisplay.subtitle}
          onPress={() => router.push("/(create-commit)/penaltywaivers")}
          className="h-28 pb-4"
          selected={!!draft.penalty_waiver}
          selectionColor={THEME.colors.success}
          onClear={() => setDraft({ penalty_waiver: null })}
        />

        {/* ── Section: Commitment Type (Just Show Up / Stay Throughout) ── */}
        <UView className="mt-3 mb-2">
          <HeaderTitle>Commitment Type</HeaderTitle>
        </UView>

        <SettingsToggleCard
          className="mb-4"
          items={commitmentSettingsItems}
        />

        {/* ── Section: Alarm Configuration ── */}
        <UView className="mt-2 mb-2">
          <HeaderTitle>Alarms</HeaderTitle>
        </UView>

        <SettingsToggleCard
          className="mb-4"
          items={alarmSettingsItems}
        />

        {/* ── Section: Waiver Rules ── */}
        <UView className="mt-2 mb-2">
          <HeaderTitle>Waiver Rules</HeaderTitle>
        </UView>

        <SettingsToggleCard
          className="mb-6"
          items={waiverSettingsItems}
        />
        
    </ActionScreenLayout>

      {/* ── Modal: Commit Confirmation ── */}
      <ConfirmationModal
        visible={confirmModalVisible}
        title={isEditMode ? "Update this CommitT?" : "Create this CommitT?"}
        confirmText={isEditMode ? "Update" : "Commit"}
        cancelText="Cancel"
        confirmColor={THEME.colors.primary}
        cancelColor={THEME.colors.danger}
        onConfirm={submitTask}
        onCancel={() => setConfirmModalVisible(false)}
        isLoading={isSubmitting}
      />

      {/* ── Modal: Validation / Error Feedback ── */}
      <ConfirmationModal
        visible={errorModal.visible}
        title={errorModal.message}
        confirmText="Ok"
        singleButton={true}
        onConfirm={() => setErrorModal({ visible: false, message: "" })}
        onCancel={() => setErrorModal({ visible: false, message: "" })}
      />

      {/* ── Sheet: Reusable Selection Picker ── */}
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
