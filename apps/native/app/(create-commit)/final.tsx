import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { withUniwind } from "uniwind";
import { useMutation } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import type { Id } from "@commit/backend/convex/_generated/dataModel";

import { AddButton, Input, PrimaryButton } from "@/components/ui";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { MiniConditionCard } from "@/components/ui/commits/MiniConditionCard";
import { CommitCard } from "@/components/ui/commits/DigitalCommitment";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import { HeaderTitle } from "@/components/ui/text";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";
import { validateTaskDraft } from "@/lib/validation/taskDraft";
import type { TaskDraft, Condition as StoreCondition } from "@/stores/useTaskDraftStore";

// ─────────────────────────────────────────────────────────────────────────────
// Styled Components
// ─────────────────────────────────────────────────────────────────────────────

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

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

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

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

    try {
      let result: MutationResult;

      if (isEditMode) {
        result = await updateTask({
          id: draft.id as Id<"tasks">,
          title: draft.title,
          description: draft.description,
          visibility: draft.visibility,
          recurrence: draft.recurrence,
          conditions: cleanedConditions,
        });
      } else {
        result = await createTask({
          assignee_id: draft.assignee_id,
          title: draft.title,
          description: draft.description,
          visibility: draft.visibility,
          recurrence: draft.recurrence,
          conditions: cleanedConditions,
        });
      }

      handleMutationResult(result);
    } catch (error) {
      console.error("[submitTask] Error:", error);
      // Determine if it's a Convex error or network error
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
  }, [draft, isEditMode, createTask, updateTask, handleMutationResult]);

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
    </UView>
  );
}
