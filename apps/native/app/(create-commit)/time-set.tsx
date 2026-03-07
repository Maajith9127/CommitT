import { router } from "expo-router";
import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Components
import { ActionScreenLayout, AddButton, PrimaryButton } from "@/components/ui";
import { HeaderTitle } from "@/components/ui/text";
import { DaySelector } from "@/components/ui/time/DaySelector";
import { TimePicker } from "@/components/ui/time/TimePicker";
import { TimeSlotCard } from "@/components/ui/time/TimeSlotCard";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";

// State & Utilities
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";
import { validateTimeSlot } from "@/lib/validation/timeSlot";
import { timeToSeconds, secondsToDisplay, type TimeInput } from "@/lib/time";

// Styled components
const UView = withUniwind(View);
const UText = withUniwind(Text);
const UPressable = withUniwind(Pressable);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TimeSlot = {
  start: number;
  end: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TimeSetScreen() {
  const [pickerVisible, setPickerVisible] = useState(false);
  
  // Error modal state for validation failures
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });

  // Zustand selectors
  const draft = useTaskDraftStore((s) => s.draft);
  const setRecurrence = useTaskDraftStore((s) => s.setRecurrence);
  const setTimeWindows = useTaskDraftStore((s) => s.setTimeWindows);
  const removeTimeWindow = useTaskDraftStore((s) => s.removeTimeWindow);

  // Get time slots directly from recurrence.time_windows
  const timeSlots: TimeSlot[] = draft.recurrence.time_windows;

  // ───────────────────────────────────────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Handle saving a new time slot from the picker.
   * Validates before updating Zustand state.
   */
  function handleSaveTimeSlot(from: TimeInput, to: TimeInput) {
    const start = timeToSeconds(from.hour, from.minute, from.period);
    const end = timeToSeconds(to.hour, to.minute, to.period);

    // Validate before updating state
    const validation = validateTimeSlot(start, end, timeSlots);
    if (!validation.valid) {
      setErrorModal({ visible: true, message: validation.error });
      return;
    }

    // Add new slot and sort by start time
    const updatedSlots = [...timeSlots, { start, end }].sort(
      (a, b) => a.start - b.start
    );

    // Update time_windows in recurrence
    setTimeWindows(updatedSlots);
  }

  /**
   * Remove a time slot by index.
   */
  function handleRemoveSlot(index: number) {
    removeTimeWindow(index);
  }

  /**
   * Toggle the "Repeat" setting for recurrence.
   * Only enabled when at least one day is selected.
   */
  function handleToggleRepeat() {
    const hasDays = draft.recurrence.days_of_week && draft.recurrence.days_of_week.length > 0;
    if (!hasDays) return;

    const isRecurring = draft.recurrence.ends?.type === "never";
    
    if (isRecurring) {
      setRecurrence({ 
        ends: { 
          type: "after", 
          count: 1 // Store will recalculate based on days * slots
        } 
      });
    } else {
      // Logic: Turn REPEAT ON -> Never Ends
      setRecurrence({ ends: { type: "never" } });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Derived State
  // ───────────────────────────────────────────────────────────────────────────

  const hasDaysSelected = draft.recurrence.days_of_week && draft.recurrence.days_of_week.length > 0;
  const hasTimeSlots = timeSlots.length > 0;
  const canSave = hasDaysSelected && hasTimeSlots;
  const isRepeatEnabled = draft.recurrence.ends?.type === "never";

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <>
      <ActionScreenLayout
        paddingHorizontal={16}
        className="bg-black pt-20"
        footer={
          <PrimaryButton 
            onPress={() => router.push("/(create-commit)/final")}
            disabled={!canSave}
            className={canSave ? "opacity-100" : "opacity-25"}
          >
            Save
          </PrimaryButton>
        }
      >
        {/* Header (Inside scroll for unified physics) */}
        <UView className="mb-8">
          <HeaderTitle className="text-3xl text-blue-400">Active Time</HeaderTitle>
          <UText className="mt-1 mb-0 text-left text-base text-gray-400">
            Choose when this commitment is active
          </UText>
        </UView>

        {/* Days Section */}
        <UView className="mb-4 flex-row items-center justify-between">
          <HeaderTitle>Days</HeaderTitle>

          {/* Repeat Toggle */}
          <UPressable
            disabled={!hasDaysSelected}
            onPress={handleToggleRepeat}
            className={`flex-row items-center gap-2 ${hasDaysSelected ? "opacity-100" : "opacity-25"}`}
          >
            <HeaderTitle>Repeat</HeaderTitle>
            <UView
              className={`h-6 w-6 rounded-md border-2 ${
                isRepeatEnabled ? "border-[#4FA0FF] bg-[#4FA0FF]" : "border-gray-600"
              }`}
              style={{ justifyContent: "center", alignItems: "center" }}
            >
              {isRepeatEnabled && (
                <MaterialCommunityIcons name="check" size={18} color="black" />
              )}
            </UView>
          </UPressable>
        </UView>

        {/* Day Selector */}
        <UView className="mb-8">
          <DaySelector />
        </UView>

        {/* Times Section */}
        <UView className="mb-6">
          {/* Times Header with Add Button */}
          <UView className="mb-2 flex-row items-center justify-between">
            <HeaderTitle>Times</HeaderTitle>
            <UView className={hasDaysSelected ? "opacity-100" : "opacity-25"}>
              <AddButton 
                onPress={() => setPickerVisible(true)} 
                disabled={!hasDaysSelected}
              />
            </UView>
          </UView>

          {/* Existing Time Slots */}
          {timeSlots.map((slot, index) => (
            <TimeSlotCard
              key={index}
              startTime={secondsToDisplay(slot.start)}
              endTime={secondsToDisplay(slot.end)}
              onRemove={() => handleRemoveSlot(index)}
            />
          ))}
        </UView>
      </ActionScreenLayout>

      {/* Time Picker Modal */}
      <TimePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSave={handleSaveTimeSlot}
      />

      {/* Validation Error Modal */}
      <ConfirmationModal
        visible={errorModal.visible}
        title={errorModal.message}
        cancelText="Cancel"
        confirmText="Change"
        onCancel={() => setErrorModal({ visible: false, message: "" })}
        onConfirm={() => {
          setErrorModal({ visible: false, message: "" });
          setPickerVisible(true); // Re-open picker to change time
        }}
      />
    </>
  );
}
