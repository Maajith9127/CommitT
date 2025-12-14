import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { withUniwind } from "uniwind";

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
		<UView className="mt-3 flex-row justify-between">
			{days.map((day) => {
				const isActive = selected.includes(day);

				return (
					<UPressable
						key={day}
						className={`w- h-11 w-11 items-center justify-center rounded-full ${
							isActive ? "bg-[#4FA0FF]" : "bg-[#1A1A1A]"
						}`}
						onPress={() => toggle(day)}
					>
						<UText
							className={`font-semibold text-sm ${
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
