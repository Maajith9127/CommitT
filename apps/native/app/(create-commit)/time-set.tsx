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
import { timeToSeconds, secondsToDisplay, secondsToTimeInput, type TimeInput } from "@/lib/time";

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
  
  /**
   * editingSlotIndex: Pointer to the slot being surgically modified.
   * If null, the picker operates in 'Addition Mode'.
   */
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  /**
   * pendingTimes: Cache for inputs that failed validation.
   * Prevents the picker from resetting to default values (6-8 AM) when 
   * the user is asked to fix an error.
   */
  const [pendingTimes, setPendingTimes] = useState<{ from: TimeInput; to: TimeInput } | null>(null);

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
   * Handle saving a time slot from the picker.
   * Supports both 'Addition' and 'Surgery' (Update) modes.
   */
  function handleSaveTimeSlot(from: TimeInput, to: TimeInput) {
    const start = timeToSeconds(from.hour, from.minute, from.period);
    const end = timeToSeconds(to.hour, to.minute, to.period);

    // Filter out the slot we are editing for validation (to allow 'in-place' edits)
    const otherSlots = editingSlotIndex !== null 
      ? timeSlots.filter((_, i) => i !== editingSlotIndex)
      : timeSlots;

    // Validate before updating state
    const validation = validateTimeSlot(start, end, otherSlots);
    if (!validation.valid) {
      console.warn(`[TimeSet] Validation fault: ${validation.error}. Stashing pending manifest.`);
      setPendingTimes({ from, to }); // Cache the invalid values for correction
      setErrorModal({ visible: true, message: validation.error });
      return;
    }

    let updatedSlots = [...timeSlots];

    if (editingSlotIndex !== null) {
      // SURGERY MODE: Update specific index
      console.log(`[TimeSet] Executing surgical update on slot ${editingSlotIndex}`);
      updatedSlots[editingSlotIndex] = { start, end };
    } else {
      // ADDITION MODE: Append new window
      console.log("[TimeSet] Appending new time window manifest");
      updatedSlots.push({ start, end });
    }

    // Sort by start time for deterministic schedule execution
    updatedSlots.sort((a, b) => a.start - b.start);

    // Update time_windows in recurrence
    setTimeWindows(updatedSlots);
    setPickerVisible(false);
    setEditingSlotIndex(null);
    setPendingTimes(null); // Clear pending state on success
  }

  /**
   * Triggers the TimePicker in 'Edit Mode' for an existing slot.
   */
  function handleEditSlot(index: number) {
    console.log(`[TimeSet] Opening Surgery Manifest for slot ${index}`);
    setEditingSlotIndex(index);
    setPickerVisible(true);
  }

  /**
   * Cleans up state when picker/modal is dismissed.
   * Protects editing context if an error modal is active.
   */
  function handleClosePicker() {
    setPickerVisible(false);
    
    // CRITICAL: If an error modal is visible, we DO NOT purge the editingSlotIndex 
    // or pendingTimes. This allows the 'Change' button to restore the context.
    if (!errorModal.visible) {
      console.log("[TimeSet] Cleaning up interactive manifest states");
      setEditingSlotIndex(null);
      setPendingTimes(null);
    }
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

  // PREP INITIAL MANIFEST:
  // Priority order: 
  // 1. Pending (Failed) inputs 
  // 2. Existing slot data (if editing)
  // 3. undefined (defaults to 6-8 AM)
  const initialFrom = pendingTimes?.from ?? (editingSlotIndex !== null ? secondsToTimeInput(timeSlots[editingSlotIndex].start) : undefined);
  const initialTo = pendingTimes?.to ?? (editingSlotIndex !== null ? secondsToTimeInput(timeSlots[editingSlotIndex].end) : undefined);

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
              onPress={() => handleEditSlot(index)}
            />
          ))}
        </UView>
      </ActionScreenLayout>

      {/* Time Picker Modal */}
      <TimePicker
        visible={pickerVisible}
        onClose={handleClosePicker}
        onSave={handleSaveTimeSlot}
        initialFrom={initialFrom}
        initialTo={initialTo}
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
