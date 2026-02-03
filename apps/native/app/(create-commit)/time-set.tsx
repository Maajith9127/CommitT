/**
 * Time Set Screen
 *
 * Allows user to configure:
 * - Days of the week for the task
 * - Time slots (windows when task is active)
 * - Recurrence settings (repeat on/off)
 *
 * Data is stored in Zustand (useTaskDraftStore) and validated
 * before saving using lib/validation/timeSlot.ts.
 */

import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Components
import { ScreenHeader } from "@/components/ui";
import { AddButton, PrimaryButton } from "@/components/ui/button";
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
const UScroll = withUniwind(ScrollView);
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
  const addCondition = useTaskDraftStore((s) => s.addCondition);
  const updateCondition = useTaskDraftStore((s) => s.updateCondition);
  const removeCondition = useTaskDraftStore((s) => s.removeCondition);
  const setRecurrence = useTaskDraftStore((s) => s.setRecurrence);

  // Extract time slots from conditions
  const timeCondition = draft.conditions.find(
    (c) => c.metric_key === "time" && c.relation === "range"
  );
  const timeSlots: TimeSlot[] = timeCondition?.target?.value ?? [];

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

    // Update or create the time condition
    if (timeCondition) {
      updateCondition(timeCondition.id, {
        target: { type: "array", value: updatedSlots },
      });
    } else {
      addCondition({
        metric_key: "time",
        relation: "range",
        target: { type: "array", value: updatedSlots },
      });
    }
  }

  /**
   * Remove a time slot by index.
   * If last slot is removed, removes the entire time condition.
   */
  function handleRemoveSlot(index: number) {
    if (!timeCondition) return;

    const updatedSlots = timeSlots.filter((_, i) => i !== index);

    if (updatedSlots.length === 0) {
      removeCondition(timeCondition.id);
    } else {
      updateCondition(timeCondition.id, {
        target: { type: "array", value: updatedSlots },
      });
    }
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
      setRecurrence({ ends: undefined });
    } else {
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
    <UView className="flex-1 bg-black">
      {/* Header */}
      <ScreenHeader>
        <HeaderTitle className="mt-16 text-3xl text-blue-400">Active Time</HeaderTitle>
        <UText className="mt-1 mb-0 text-left text-base text-gray-400">
          Choose when this commitment is active
        </UText>
      </ScreenHeader>

      {/* Main Content */}
      <UScroll className="mt-6 flex-1 px-4">
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
      </UScroll>

      {/* Save Button - disabled if no days or no time slots */}
      <UView className={`mb-8 px-4 ${canSave ? "opacity-100" : "opacity-25"}`}>
        <PrimaryButton 
          onPress={() => router.push("/(create-commit)/final")}
          disabled={!canSave}
        >
          Save
        </PrimaryButton>
      </UView>

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
    </UView>
  );
}
