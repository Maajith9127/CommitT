import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components/ui";
import { AddButton, PrimaryButton } from "@/components/ui/button";
import { HeaderTitle } from "@/components/ui/text";
import { DaySelector } from "@/components/ui/time/DaySelector";
import { TimePicker } from "@/components/ui/time/TimePicker";
import { TimeSlotCard } from "@/components/ui/time/TimeSlotCard";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UText = withUniwind(Text);
const UPressable = withUniwind(Pressable);

// Helper to convert time to seconds from midnight
function timeToSeconds(hour: number, minute: number, period: "AM" | "PM"): number {
  let h = hour % 12;
  if (period === "PM") h += 12;
  return h * 3600 + minute * 60;
}

// Helper to convert seconds to display format
function secondsToDisplay(totalSeconds: number): string {
  const h24 = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const period = h24 >= 12 ? "pm" : "am";
  const hour12 = h24 % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function TimeSetScreen() {
  const [pickerVisible, setPickerVisible] = useState(false);
  const { draft, addCondition, updateCondition, removeCondition, setRecurrence } = useTaskDraftStore();

  // Find the single time condition (range relation)
  const timeCondition = draft.conditions.find((c: any) => c.metric_key === "time" && c.relation === "range");
  const timeSlots: { start: number; end: number }[] = timeCondition?.target?.value ?? [];

  function handleSaveTimeSlot(
    from: { hour: number; minute: number; period: "AM" | "PM" },
    to: { hour: number; minute: number; period: "AM" | "PM" },
  ) {
    const start = timeToSeconds(from.hour, from.minute, from.period);
    const end = timeToSeconds(to.hour, to.minute, to.period);

    const updatedSlots = [...timeSlots, { start, end }].sort((a, b) => a.start - b.start);

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

  return (
    <UView className="flex-1 bg-black">
      {/* HEADER */}
      <ScreenHeader>
        <HeaderTitle className="mt-16 text-3xl text-blue-400">Active Time</HeaderTitle>
        <UText className="mt-1 mb-0 text-left text-base text-gray-400">
          Choose when this commitment is active
        </UText>
      </ScreenHeader>

      {/* MAIN CONTENT */}
      <UScroll className="mt-6 flex-1 px-4">
        {/* DAYS HEADER WITH RECURRING TOGGLE */}
        <UView className="mb-4 flex-row items-center justify-between">
          <HeaderTitle>Days</HeaderTitle>
          
          <UPressable 
            disabled={!draft.recurrence.days_of_week || draft.recurrence.days_of_week.length === 0}
            onPress={() => {
                if (!draft.recurrence.days_of_week || draft.recurrence.days_of_week.length === 0) return;
                
                const isRecurring = draft.recurrence.ends?.type === "never";
                if (isRecurring) {
                    // Turn Repeat OFF -> Use undefined to clear the property in the merge
                    setRecurrence({ ends: undefined });
                } else {
                    // Turn Repeat ON -> Set to 'never' end
                    setRecurrence({ ends: { type: "never" } });
                }
            }}
            className={`flex-row items-center gap-2 ${(!draft.recurrence.days_of_week || draft.recurrence.days_of_week.length === 0) ? "opacity-30" : "opacity-100"}`}
          >
            <HeaderTitle>Repeat</HeaderTitle>
            <UView 
                className={`h-6 w-6 rounded-md border-2 ${draft.recurrence.ends?.type === "never" ? "border-[#4FA0FF] bg-[#4FA0FF]" : "border-gray-600"}`}
                style={{ justifyContent: 'center', alignItems: 'center' }}
            >
                {draft.recurrence.ends?.type === "never" && (
                    <MaterialCommunityIcons name="check" size={18} color="black" />
                )}
            </UView>
          </UPressable>
        </UView>

        {/* DAYS SELECTOR (Always visible) */}
        <UView className="mb-8">
          <DaySelector />
        </UView>

        {/* TIMES */}
        <UView className="mb-6">
          <HeaderTitle>Times</HeaderTitle>

          {/* Render time slots from Zustand */}
          {timeSlots.map((slot, index) => (
            <TimeSlotCard
              key={index}
              startTime={secondsToDisplay(slot.start)}
              endTime={secondsToDisplay(slot.end)}
              onRemove={() => handleRemoveSlot(index)}
            />
          ))}

          {/* ADD BUTTON */}
          <UView className="mt-2 w-[25%]">
            <AddButton onPress={() => setPickerVisible(true)} />
          </UView>
        </UView>
      </UScroll>

      {/* SAVE BUTTON */}
      <UView className="mb-8 px-4">
        <PrimaryButton
          onPress={() => {
            router.push("/(create-commit)/final");
          }}
        >
          Save
        </PrimaryButton>
      </UView>

      {/* POPUP */}
      <TimePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSave={handleSaveTimeSlot}
      />
    </UView>
  );
}
