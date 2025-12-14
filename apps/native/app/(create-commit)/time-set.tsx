import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { ScreenHeader } from "@/components/ui";
import { AddButton, PrimaryButton } from "@/components/ui/button";
import { HeaderTitle } from "@/components/ui/text";
import { DaySelector } from "@/components/ui/time/DaySelector";
//  Correct import (named export)
import { TimePicker } from "@/components/ui/time/TimePicker";
import { TimeSlotCard } from "@/components/ui/time/TimeSlotCard";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UText = withUniwind(Text);

export default function TimeSetScreen() {
	const [selectedDays, setSelectedDays] = useState<string[]>([]);
	const [pickerVisible, setPickerVisible] = useState(false);

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

					<DaySelector value={selectedDays} onChange={setSelectedDays} />
				</UView>

				{/* TIMES */}
				<UView className="mb-6">
					<UText className="mb-3 text-gray-300 text-lg">Times</UText>

					<TimeSlotCard startTime="6:00 am" endTime="8:00 am" />
					<TimeSlotCard startTime="9:00 am" endTime="10:00 am" />
					<TimeSlotCard startTime="12:00 pm" endTime="2:00 pm" />
					<TimeSlotCard startTime="4:00 pm" endTime="6:00 pm" />
					<TimeSlotCard startTime="8:00 pm" endTime="10:00 pm" />

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
				onSave={(from, to) => {
					console.log("Picked Time Range →", { from, to });
					// from: { hour: 6, minute: 0, period: "AM" }
					// to: { hour: 8, minute: 0, period: "AM" }
				}}
			/>
		</UView>
	);
}
