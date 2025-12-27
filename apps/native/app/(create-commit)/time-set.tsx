import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { withUniwind } from "uniwind";
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

// Helper to convert 12h to 24h format string
function formatTo24h(hour: number, minute: number, period: "AM" | "PM"): string {
	let h = hour;
	if (period === "PM" && hour !== 12) h += 12;
	if (period === "AM" && hour === 12) h = 0;
	return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// Helper to convert 24h string to display format
function formatToDisplay(time24: string): string {
	const [h, m] = time24.split(":").map(Number);
	const period = h >= 12 ? "pm" : "am";
	const hour12 = h % 12 || 12;
	return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function TimeSetScreen() {
	const [pickerVisible, setPickerVisible] = useState(false);
	const { draft, addCondition, removeCondition } = useTaskDraftStore();

	// Get all time slot conditions (metric: "time", relation: "within"), sorted by start time
	const timeSlots = draft.conditions
		.filter((c) => c.metric === "time" && c.relation === "within")
		.sort((a, b) => a.target.value.start.localeCompare(b.target.value.start));

	function handleSaveTimeSlot(
		from: { hour: number; minute: number; period: "AM" | "PM" },
		to: { hour: number; minute: number; period: "AM" | "PM" }
	) {
		const start = formatTo24h(from.hour, from.minute, from.period);
		const end = formatTo24h(to.hour, to.minute, to.period);

		// Check if this exact time slot already exists
		const isDuplicate = timeSlots.some(
			(slot) =>
				slot.target.value.start === start && slot.target.value.end === end
		);

		if (isDuplicate) {
			return; // Don't add duplicate
		}

		addCondition({
			metric: "time",
			relation: "within",
			target: {
				type: "range",
				value: { start, end },
			},
		});
	}

	return (
		<UView className="flex-1 bg-black">
			{/* HEADER */}
			<ScreenHeader>
				<HeaderTitle className="mt-16 text-3xl text-blue-400">
					Active Time
				</HeaderTitle>

				<UText className="mt-1 mb-0 text-left text-base text-gray-400">
					Choose when this commitment is active
				</UText>
			</ScreenHeader>

			{/* MAIN CONTENT */}
			<UScroll className="mt-6 flex-1 px-4">
				{/* DAYS */}
				<UView className="mb-6">
					<UText className="mb-3 text-gray-300 text-lg">Days</UText>
					<DaySelector />
				</UView>

				{/* TIMES */}
				<UView className="mb-6">
					<UText className="mb-3 text-gray-300 text-lg">Times</UText>

					{/* Render time slots from Zustand */}
					{timeSlots.map((slot) => (
						<TimeSlotCard
							key={slot.id}
							startTime={formatToDisplay(slot.target.value.start)}
							endTime={formatToDisplay(slot.target.value.end)}
							onRemove={() => removeCondition(slot.id)}
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
						router.push("/final");
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
