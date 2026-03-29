/**
 * TimeSetScreen
 * ─────────────────────────────────────────────────────────────────────────────
 * Schedule configuration screen for commitment creation.
 *
 * CORE RESPONSIBILITIES:
 *   1. Day selection (Mon-Sun) with repeat toggle
 *   2. Time window management (add, edit, remove slots)
 *   3. Per-slot context attachment (location presets, app blocklists)
 *
 * PER-SLOT CONDITIONS:
 *   Each time slot can have its own location and app-blocking rules.
 *   Presets are read from the Zustand PresetStore (hydrated at layout level)
 *   and selected via BaseDrawerModal-backed pickers.
 */

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
import { LocationPresetPickerModal } from "@/components/ui/modal/LocationPresetPickerModal";
import { DigitalPresetPickerModal } from "@/components/ui/modal/DigitalPresetPickerModal";

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

/** Per-slot condition state — tracks which presets are attached to each slot */
type SlotConditions = Record<number, {
  location?: { _id: string; address: string; [key: string]: any };
  digital?: { _id: string; name?: string; apps: string[]; [key: string]: any };
}>;

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

  // ── Per-Slot Preset Picker State ──
  const [contextSlotIndex, setContextSlotIndex] = useState<number | null>(null);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [digitalPickerVisible, setDigitalPickerVisible] = useState(false);

  // Zustand selectors
  const draft = useTaskDraftStore((s) => s.draft);
  const setRecurrence = useTaskDraftStore((s) => s.setRecurrence);
  const setTimeWindows = useTaskDraftStore((s) => s.setTimeWindows);
  const removeTimeWindow = useTaskDraftStore((s) => s.removeTimeWindow);
  const setSlotLocation = useTaskDraftStore((s) => s.setSlotLocation);
  const setSlotBlocklist = useTaskDraftStore((s) => s.setSlotBlocklist);

  // Get time slots directly from recurrence.time_windows
  const timeSlots: TimeSlot[] = draft.recurrence.time_windows;

  // ───────────────────────────────────────────────────────────────────────────
  // Time Slot Handlers
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Handle saving a time slot from the picker.
   * Supports both 'Addition' and 'Surgery' (Update) modes.
   */
  function handleSaveTimeSlot(from: TimeInput, to: TimeInput) {
    const start = timeToSeconds(from.hour, from.minute, from.period);
    const end = timeToSeconds(to.hour, to.minute, to.period);

    const otherSlots = editingSlotIndex !== null 
      ? timeSlots.filter((_, i) => i !== editingSlotIndex)
      : timeSlots;

    const validation = validateTimeSlot(start, end, otherSlots);
    if (!validation.valid) {
      console.warn(`[TimeSet] Validation fault: ${validation.error}. Stashing pending manifest.`);
      setPendingTimes({ from, to });
      setErrorModal({ visible: true, message: validation.error });
      return;
    }

    let updatedSlots = [...timeSlots];

    if (editingSlotIndex !== null) {
      console.log(`[TimeSet] Executing surgical update on slot ${editingSlotIndex}`);
      updatedSlots[editingSlotIndex] = { start, end };
    } else {
      console.log("[TimeSet] Appending new time window manifest");
      updatedSlots.push({ start, end });
    }

    updatedSlots.sort((a, b) => a.start - b.start);
    setTimeWindows(updatedSlots);
    setPickerVisible(false);
    setEditingSlotIndex(null);
    setPendingTimes(null);
  }

  function handleEditSlot(index: number) {
    console.log(`[TimeSet] Opening Surgery Manifest for slot ${index}`);
    setEditingSlotIndex(index);
    setPickerVisible(true);
  }

  function handleClosePicker() {
    setPickerVisible(false);
    if (!errorModal.visible) {
      console.log("[TimeSet] Cleaning up interactive manifest states");
      setEditingSlotIndex(null);
      setPendingTimes(null);
    }
  }

  /**
   * Remove a time slot by index.
   * Also re-indexes any attached per-slot conditions.
   */
  function handleRemoveSlot(index: number) {
    removeTimeWindow(index);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Per-Slot Preset Handlers
  // ───────────────────────────────────────────────────────────────────────────

  function handleOpenLocationPicker(slotIndex: number) {
    console.log(`[TimeSet] Opening Location Picker for slot ${slotIndex}`);
    setContextSlotIndex(slotIndex);
    setLocationPickerVisible(true);
  }

  function handleOpenDigitalPicker(slotIndex: number) {
    console.log(`[TimeSet] Opening Digital Picker for slot ${slotIndex}`);
    setContextSlotIndex(slotIndex);
    setDigitalPickerVisible(true);
  }

  /**
   * Handles location preset selection (or null for deselect).
   */
  function handleLocationSelected(preset: any) {
    if (contextSlotIndex === null) return;
    
    if (preset === null) {
      console.log(`[TimeSet] Location detached from slot ${contextSlotIndex}`);
      setSlotLocation(contextSlotIndex, null);
    } else {
      console.log(`[TimeSet] Location attached to slot ${contextSlotIndex}:`, preset.address);
      setSlotLocation(contextSlotIndex, {
        id: preset._id, // Pass the preset ID for tracking
        latitude: preset.lat,
        longitude: preset.lng,
        radius: preset.radius,
        address: preset.address,
        isInverse: false, // Standard location check
      });
    }
  }

  /**
   * Handles digital preset selection (or null for deselect).
   */
  function handleDigitalSelected(preset: any) {
    if (contextSlotIndex === null) return;
    
    if (preset === null) {
      console.log(`[TimeSet] Digital commitment detached from slot ${contextSlotIndex}`);
      setSlotBlocklist(contextSlotIndex, { apps: [], websites: [] });
    } else {
      console.log(`[TimeSet] Digital preset attached to slot ${contextSlotIndex}:`, preset.name || `${preset.apps.length} apps`);
      setSlotBlocklist(contextSlotIndex, {
        id: preset._id, // Pass the preset ID for tracking
        apps: preset.apps,
        websites: preset.websites,
      });
    }
  }

  function handleToggleRepeat() {
    const hasDays = draft.recurrence.days_of_week && draft.recurrence.days_of_week.length > 0;
    if (!hasDays) return;

    const isRecurring = draft.recurrence.ends?.type === "never";
    
    if (isRecurring) {
      setRecurrence({ ends: { type: "after", count: 1 } });
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

  const initialFrom = pendingTimes?.from ?? (editingSlotIndex !== null ? secondsToTimeInput(timeSlots[editingSlotIndex].start) : undefined);
  const initialTo = pendingTimes?.to ?? (editingSlotIndex !== null ? secondsToTimeInput(timeSlots[editingSlotIndex].end) : undefined);

  // ── Context-Specific IDs for Pickers ──
  const currentSlot = contextSlotIndex !== null ? timeSlots[contextSlotIndex] : null;
  const currentConditions = (currentSlot as any)?.conditions || [];
  
  const currentLocCond = currentConditions.find((c: any) => c.metric_key === "location");
  const selectedLocationId = (currentLocCond?.target?.value as any)?.id || null;

  const currentDigitalCond = currentConditions.find((c: any) => c.metric_key === "digital_commitment");
  const selectedDigitalId = (currentDigitalCond?.target?.value as any)?.id || null;

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
        {/* Header */}
        <UView className="mb-8">
          <HeaderTitle className="text-3xl text-blue-400">Active Time</HeaderTitle>
          <UText className="mt-1 mb-0 text-left text-base text-gray-400">
            Choose when this commitment is active
          </UText>
        </UView>

        {/* Days Section */}
        <UView className="mb-4 flex-row items-center justify-between">
          <HeaderTitle>Days</HeaderTitle>

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

        <UView className="mb-8">
          <DaySelector />
        </UView>

        {/* Times Section */}
        <UView className="mb-6">
          <UView className="mb-2 flex-row items-center justify-between">
            <HeaderTitle>Times</HeaderTitle>
            <UView className={hasDaysSelected ? "opacity-100" : "opacity-25"}>
              <AddButton 
                onPress={() => setPickerVisible(true)} 
                disabled={!hasDaysSelected}
              />
            </UView>
          </UView>

          {/* Time Slot Cards — wired to preset pickers */}
          {timeSlots.map((slot: any, index: number) => {
            const slotConditions = slot.conditions || [];
            
            const locationCondition = slotConditions.find((c: any) => c.metric_key === "location");
            const digitalCondition = slotConditions.find((c: any) => c.metric_key === "digital_commitment");

            const locationLabel = (locationCondition?.target?.value as any)?.address || null;
            const digitalLabel = digitalCondition?.target?.value 
              ? (digitalCondition.target.value.apps?.length || 0) + " Apps Blocked"
              : null;
            
            const selectedLocationId = (locationCondition?.target?.value as any)?.id || null;
            const selectedDigitalId = (digitalCondition?.target?.value as any)?.id || null;

            return (
              <TimeSlotCard
                key={index}
                startTime={secondsToDisplay(slot.start)}
                endTime={secondsToDisplay(slot.end)}
                onRemove={() => handleRemoveSlot(index)}
                onPress={() => handleEditSlot(index)}
                onLocationPress={() => handleOpenLocationPicker(index)}
                onDigitalPress={() => handleOpenDigitalPicker(index)}
                locationLabel={locationLabel}
                digitalLabel={digitalLabel}
                appIds={digitalCondition?.target?.value?.apps || null}
              />
            );
          })}
        </UView>

        {/* Bottom spacer — ensures expanded cards are never clipped behind the footer */}
        <UView style={{ height: 120 }} />
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
          setPickerVisible(true);
        }}
      />

      {/* ── Per-Slot Preset Picker Modals ── */}
      <LocationPresetPickerModal
        visible={locationPickerVisible}
        onClose={() => {
          setLocationPickerVisible(false);
          setContextSlotIndex(null);
        }}
        onSelect={handleLocationSelected}
        selectedId={selectedLocationId}
      />

      <DigitalPresetPickerModal
        visible={digitalPickerVisible}
        onClose={() => {
          setDigitalPickerVisible(false);
          setContextSlotIndex(null);
        }}
        onSelect={handleDigitalSelected}
        selectedId={selectedDigitalId}
      />
    </>
  );
}
