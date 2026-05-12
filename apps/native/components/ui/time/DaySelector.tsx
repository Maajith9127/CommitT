import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { withUniwind } from "uniwind";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";
import { THEME } from "@/constants/theme";

const UView = withUniwind(View);
const UText = withUniwind(Text);
const UPressable = withUniwind(Pressable);

const dayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

export function DaySelector() {
  const { draft, setRecurrence } = useTaskDraftStore();
  const selectedDays = draft.recurrence.days_of_week ?? [];

  function toggle(dayIndex: number) {
    let updated: number[];

    if (selectedDays.includes(dayIndex)) {
      updated = selectedDays.filter((d) => d !== dayIndex);
    } else {
      updated = [...selectedDays, dayIndex].sort();
    }

    setRecurrence({ days_of_week: updated });
  }

  return (
    <UView className="mt-3 flex-row justify-between">
      {dayLabels.map((label, i) => {
        const dayValue = i + 1; // Mon=1, ..., Sun=7
        const isActive = selectedDays.includes(dayValue);

        return (
          <Pressable
            key={label}
            onPress={() => toggle(dayValue)}
          >
            {({ pressed }: { pressed: boolean }) => (
              <UView
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{
                  backgroundColor: isActive ? THEME.colors.primary : THEME.colors.surface,
                  opacity: pressed ? 0.7 : 1
                }}
              >
                <UText
                  className="font-semibold"
                  style={{ color: isActive ? THEME.colors.textMain : THEME.colors.textMuted, fontSize: THEME.typography.size.sm }}
                >
                  {label}
                </UText>
              </UView>
            )}
          </Pressable>
        );
      })}
    </UView>
  );
}
