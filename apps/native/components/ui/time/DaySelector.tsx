import { Text, TouchableOpacity, View } from "react-native";
import { withUniwind } from "uniwind";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";

const UView = withUniwind(View);
const UText = withUniwind(Text);
const UPressable = withUniwind(TouchableOpacity);

const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

export function DaySelector() {
	const { draft, addCondition, updateCondition, removeCondition } =
		useTaskDraftStore();

	// Find existing day condition (metric: "time", relation: "in")
	const dayCondition = draft.conditions.find(
		(c) => c.metric === "time" && c.relation === "in"
	);
	const selectedDays: string[] = dayCondition?.target?.value ?? [];

	function toggle(day: string) {
		let updated: string[];

		if (selectedDays.includes(day)) {
			updated = selectedDays.filter((d) => d !== day);
		} else {
			updated = [...selectedDays, day];
		}

		// Replace or create the day condition
		if (dayCondition) {
			if (updated.length === 0) {
				// Remove condition if no days selected
				removeCondition(dayCondition.id);
			} else {
				// Update existing condition
				updateCondition(dayCondition.id, {
					target: { type: "array", value: updated },
				});
			}
		} else if (updated.length > 0) {
			// Create new condition
			addCondition({
				metric: "time",
				relation: "in",
				target: { type: "array", value: updated },
			});
		}
	}

	return (
		<UView className="mt-3 flex-row justify-between">
			{days.map((day) => {
				const isActive = selectedDays.includes(day);

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
