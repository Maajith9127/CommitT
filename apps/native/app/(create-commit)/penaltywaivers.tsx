import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";
import { ScreenHeader } from "@/components/ui";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { AuthTitle, HeaderTitle } from "@/components/ui/text";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

export default function PenaltyWaiversScreen() {
	const router = useRouter();

	return (
		<UView className="flex-1 bg-black">
			{/* HEADER */}
			<ScreenHeader>
				<HeaderTitle className="mt-16 text-3xl text-green-400">
					Penalty Waivers
				</HeaderTitle>

				<AuthTitle className="mt-1 mb-0 text-left text-gray-400">
					Choose how you want to EARN your penalty waiver
				</AuthTitle>
			</ScreenHeader>

			{/* CONTENT */}
			<UScroll className="mt-4 px-4">
				{/* 1 — SOLVE CAPTCHAS */}
				<ConditionCard
					icon="shield-check-outline"
					iconColor="#4CD964"
					title="Solve CAPTCHAs"
					subtitle="Solve a set number of CAPTCHAs to waive your penalty"
					onPress={() => router.push("/(create-commit)/waiver-captcha")}
				/>

				{/* 2 — TYPE A LONG PARAGRAPH */}
				<ConditionCard
					icon="pencil-outline"
					iconColor="#4CD964"
					title="Write a Long Paragraph"
					subtitle="Type a 3000-word paragraph to earn a waiver"
					onPress={() => router.push("/(create-commit)/waiver-paragraph")}
				/>

				{/* 3 — REDO COMMITMENT WITH INTENSITY */}
				<ConditionCard
					icon="fire"
					iconColor="#4CD964"
					title="Redo With More Intensity"
					subtitle="Repeat tomorrow with a harder version"
					onPress={() => router.push("/(create-commit)/waiver-intense")}
				/>

				{/* 4 — RUN 5 KM */}
				<ConditionCard
					icon="run-fast"
					iconColor="#4CD964"
					title="Run 5 KM"
					subtitle="Choose a location and complete the run"
					onPress={() => router.push("/(create-commit)/waiver-run")}
				/>
			</UScroll>
		</UView>
	);
}
