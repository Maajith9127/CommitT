import { View, Text, TouchableOpacity } from "react-native";
import { withUniwind } from "uniwind";
import { useState } from "react";

const UView = withUniwind(View);
const UText = withUniwind(Text);
const UPressable = withUniwind(TouchableOpacity);

const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

export type DaySelectorProps = {
  value?: string[];
  onChange?: (days: string[]) => void;
};

export function DaySelector({ value = [], onChange }: DaySelectorProps) {
  const [selected, setSelected] = useState<string[]>(value);

  function toggle(day: string) {
    let updated: string[];

    if (selected.includes(day)) {
      updated = selected.filter((d) => d !== day);
    } else {
      updated = [...selected, day];
    }

    setSelected(updated);
    onChange?.(updated);
  }

  return (
    <UView className="flex-row justify-between mt-3">
      {days.map((day) => {
        const isActive = selected.includes(day);

        return (
          <UPressable
            key={day}
            className={`w-11 w- h-11 rounded-full items-center justify-center ${
              isActive ? "bg-[#4FA0FF]" : "bg-[#1A1A1A]"
            }`}
            onPress={() => toggle(day)}
          >
            <UText
              className={`text-sm font-semibold ${
                isActive ? "text-black" : "text-gray-300"
              }`}
            >
              {day}
            </UText>
          </UPressable>
        );
      })}
    </UView>
  );
}
