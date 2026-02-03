import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, useWindowDimensions, View, Alert } from "react-native";
import { withUniwind } from "uniwind";
import { useMutation } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";

import { AddButton, Input, PrimaryButton } from "@/components/ui";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { MiniConditionCard } from "@/components/ui/commits/MiniConditionCard";
import { CommitCard } from "@/components/ui/commits/DigitalCommitment";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import { HeaderTitle } from "@/components/ui/text";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";
import { validateTaskDraft } from "@/lib/validation/taskDraft";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

type Condition = {
  id: string;
  icon: string;
  title: string;
  subtitle?: string; 
};

export default function FinalScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const draft = useTaskDraftStore((s: any) => s.draft);
  const setTitle = useTaskDraftStore((s: any) => s.setTitle);
  const setLocation = useTaskDraftStore((s: any) => s.setLocation);
  const setAssignee = useTaskDraftStore((s: any) => s.setAssignee);
  const setDraft = useTaskDraftStore((s: any) => s.setDraft);
  
  // Detect if we're editing an existing task (has an id from backend)
  const isEditMode = Boolean(draft.id);
  
  const create = useMutation(api.tasks.create);
  const update = useMutation(api.tasks.update);

  // Metrics for MiniConditionCard carousel
  const horizontalPadding = 16;
  const cardGap = 8; 
  const visibleCards = 3.2;
  const cardWidth = (screenWidth - horizontalPadding * 2 - cardGap * Math.floor(visibleCards)) / visibleCards;

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  
  // Error modal state for validation failures
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });

  /**
   * Validate the draft before showing commit confirmation.
   * Uses centralized validation from lib/validation/taskDraft.
   */
  function handleCommitPress() {
    const validation = validateTaskDraft(draft);
    
    if (!validation.valid) {
      setErrorModal({ visible: true, message: validation.error });
      return;
    }

    // All validations passed - show confirmation modal
    setConfirmModalVisible(true);
  }

  const [conditions] = useState<Condition[]>([
    {
      id: "1",
      icon: "clock-outline",
      title: "Time",
    },
    {
      id: "2",
      icon: "map-marker-outline",
      title: "Location",
    },
    {
      id: "3",
      icon: "account-check-outline",
      title: "Partner",
    },
    {
      id: "4",
      icon: "camera-outline",
      title: "Picture",
    },
    {
      id: "5",
      icon: "video-outline",
      title: "Video",
    },
  ]);

  return (
    <UView className="flex-1 bg-black px-4 pt-20">
      {/* MAIN SCROLL AREA */}
      <UScroll showsVerticalScrollIndicator={false} className="flex-1">
        {/* TOP — ICON + NAME INPUT */}
        <UView className="mb-7 items-center">
          <MaterialCommunityIcons
            name="book"
            size={75}
            color="#4FA0FF"
            style={{ marginBottom: 16 }}
          />
          <Input 
            placeholder="Commitment Name" 
            value={draft.title}
            onChangeText={setTitle}
          />
        </UView>

        {/* CONDITIONS HEADER */}
        <UView className="mb-1 flex-row items-center justify-between">
          <HeaderTitle>Conditions</HeaderTitle>
          <AddButton onPress={() => {}} />
        </UView>

        {/* HORIZONTAL MINI CONDITION CARDS */}
        <UView>
          <UScroll horizontal showsHorizontalScrollIndicator={false} className="mb-1 flex-row py-3">
            {conditions.map((condition, index) => {
              let isSelected = false;

              let onClear: (() => void) | undefined = undefined;

              if (condition.title === "Time") {
                // Check if any time condition exists
                isSelected = draft.conditions.some((c: any) => c.metric_key === "time");
                
                if (isSelected) {
                   onClear = () => {
                      setDraft({
                         recurrence: { type: "once", interval: 1 },
                         time_window: { start_at: null, due_at: null },
                         conditions: draft.conditions.filter((c: any) => c.metric_key !== "time")
                      });
                   };
                }

              } else if (condition.title === "Location") {
                // Check if location condition exists
                isSelected = draft.conditions.some((c: any) => c.metric_key === "location");
                
                if (isSelected) {
                   onClear = () => setLocation(null);
                }

              } else if (condition.title === "Partner") {
                 // Check if assignee is set and different from self (if needed) or just set
                 // Assuming "Partner" means assignee_id is set
                 isSelected = Boolean(draft.assignee_id && draft.assignee_id !== draft.assigner_id); 
                 // Note: If assigning to self, is it "Partner"? Usually Partner means someone else.
                 // But let's assume if assignee_id is truthy.
                 
                 if (isSelected) {
                    onClear = () => setAssignee(null);
                 }
              }

              return (
                <MiniConditionCard
                  key={condition.id}
                  icon={condition.icon}
                  title={condition.title}
                  width={cardWidth}
                  className={`h-20 ${index < conditions.length - 1 ? "mr-2" : ""}`}
                  selected={isSelected}
                  selectionColor="#4FA0FF"
                  onPress={() => {
                    if (condition.title === "Time") {
                      router.push("/(create-commit)/time-set");
                    } else if (condition.title === "Location") {
                      router.push("/(create-commit)/location-set");
                    } else if (condition.title === "Partner") {
                      router.push("/(create-commit)/partner-select");
                    }
                  }}
                  onClear={onClear}
                />
              );
            })}
          </UScroll>
        </UView>

        {/* DIGITAL COMMITMENT — CLICKABLE AREA */}
        <UView className="mb-3">
          <HeaderTitle>Digital Commitment</HeaderTitle>
        </UView>

        <CommitCard className="mb-5" onPress={() => router.push("/(create-commit)/choose")} />

        {/* PENALTIES HEADER */}
        <UView className="mt-2 mb-3">
          <HeaderTitle>Penalties</HeaderTitle>
        </UView>

        {/* PENALTY CARD */}
        <ConditionCard
          icon="alert-circle-outline"
          iconColor="#FF3B30"
          title="Penalty"
          subtitle="₹500 will be deducted if you miss this commitment"
          onPress={() => router.push("/(create-commit)/penalties")}
          className="h-28 border-[3px] border-red-500 pb-4"
        />

        {/* PENALTY WAIVER HEADER */}
        <UView className="mt-3 mb-3">
          <HeaderTitle>Penalty Waiver</HeaderTitle>
        </UView>

        {/* PENALTY WAIVER CARD */}
        <ConditionCard
          icon="check-decagram-outline"
          iconColor="#4CD964"
          title="Penalty Waiver"
          subtitle="Solve 100 CAPTCHAs to waive the penalty"
          onPress={() => router.push("/(create-commit)/penaltywaivers")}
          className="h-28 border-[#4CD964] border-[3px] pb-4"
        />
      </UScroll>

      {/* FIXED FOOTER BUTTON */}
      <UView className="mb-10">
        <PrimaryButton onPress={handleCommitPress}>
          {isEditMode ? "Save" : "CommitT"}
        </PrimaryButton>
      </UView>

      {/* Commit Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModalVisible}
        title={isEditMode ? "Update this CommitT?" : "Create this CommitT?"}
        confirmText={isEditMode ? "Update" : "Commit"}
        cancelText="Cancel"
        confirmColor="#4FA0FF" 
        cancelColor="#FF3B30"
        onConfirm={async () => {
          setConfirmModalVisible(false);
          try {
             // Prepare conditions without local 'id' field
             const cleanedConditions = draft.conditions.map((c: any) => {
               const { id, ...rest } = c;
               return rest;
             });
 
             if (isEditMode) {
               const updatePayload = {
                 id: draft.id,
                 title: draft.title,
                 description: draft.description,
                 visibility: draft.visibility,
                 recurrence: draft.recurrence,
                 conditions: cleanedConditions,
               };
               await update(updatePayload as any);
             
             } else {
               const createPayload = {
                 assigner_id: draft.assigner_id,
                 assignee_id: draft.assignee_id,
                 title: draft.title,
                 description: draft.description,
                 visibility: draft.visibility,
                 recurrence: draft.recurrence,
                 conditions: cleanedConditions,
               };
               await create(createPayload as any);
             
             }
             router.push("/(main)/commits");
             
           } catch (error) {
             console.error("Failed to save task:", error);
             Alert.alert("Error", "Failed to save commitment. Please try again.");
           }
        }}
        onCancel={() => setConfirmModalVisible(false)}
      />

      {/* Validation Error Modal - Single "Ok" button */}
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
