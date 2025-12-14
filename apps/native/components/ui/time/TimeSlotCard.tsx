import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { withUniwind } from "uniwind";

import { AuthTitle } from "@/components/ui/text";

export type TimeSlotCardProps = {
	startTime: string;
	endTime: string;
	onRemove?: () => void;
};

const UView = withUniwind(View);
const UPressable = withUniwind(TouchableOpacity);

export function TimeSlotCard({
	startTime,
	endTime,
	onRemove,
}: TimeSlotCardProps) {
	return (
		<UView className="mb-3 w-full flex-row items-center rounded-3xl bg-[#1A1A1A] px-4 py-3">
			{/* Left clock icon */}
			<UView className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-[#4FA0FF]">
				<MaterialCommunityIcons name="clock-outline" size={18} color="black" />
			</UView>

			{/* Time text (left aligned) */}
			<AuthTitle className="mb-0 flex-1 text-left font-medium text-base text-white">
				{startTime} – {endTime}
			</AuthTitle>

			{/* Remove button */}
			<UPressable onPress={onRemove} className="ml-2">
				<Svg width={20} height={20} viewBox="0 0 24 24">
					<Path
						d="M18 6L6 18"
						stroke="#A1A1A1"
						strokeWidth={2}
						strokeLinecap="round"
					/>
					<Path
						d="M6 6L18 18"
						stroke="#A1A1A1"
						strokeWidth={2}
						strokeLinecap="round"
					/>
				</Svg>
			</UPressable>
		</UView>
	);
}
