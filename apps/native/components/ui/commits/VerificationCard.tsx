import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { HeaderTitle } from "@/components/ui/text";

const UView = withUniwind(View);
const UText = withUniwind(Text);

export type VerificationCardProps = {
	title?: string;
	description?: string;
	className?: string;

	challenge?: string;
	timeUntil?: string;

	//  CONTROLLED NAVIGATION
	onPress?: () => void;
};

export function VerificationCard({
	title = "Verification",
	description = "Start your verification.",
	className = "",
	challenge = "Gym",
	timeUntil = "In 2h 30m",
	onPress,
}: VerificationCardProps) {
	return (
		<UView className={`mt-4 ${className}`}>
			{/* OUTER TOUCH AREA */}
			<UView className="rounded-3xl">
				{/* INNER CARD */}
				<UView className="rounded-4xl bg-[#1A1A1A] px-4 pt-2 pb-4">
					{/* TITLE ROW */}
					<UView className="mb-2 flex-row items-center justify-between">
						<HeaderTitle className="pt-3 text-white text-xl">
							{title}
						</HeaderTitle>

						<MaterialCommunityIcons
							name="shield-alert-outline"
							size={22}
							color="#8A8A8A"
						/>
					</UView>

					<UText className="mb-4 text-base text-gray-400">
						{description}
					</UText>

					{/* PRIMARY BUTTON - ONLY THIS NAVIGATES */}
					<PrimaryButton className="mb-4" onPress={onPress}>
						Start Verification
					</PrimaryButton>

					{/* CHALLENGE + TIME */}
					<UView className="flex-row items-center justify-between">
						<SecondaryButton className="mr-2 flex-1 bg-[#2D3037] rounded-4xl">
							{challenge}
						</SecondaryButton>

						<SecondaryButton className="ml-2 flex-1 bg-[#2D3037] rounded-4xl">
							{timeUntil}
						</SecondaryButton>
					</UView>
				</UView>
			</UView>
		</UView>
	);
}