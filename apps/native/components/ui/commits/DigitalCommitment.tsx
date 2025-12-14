// components/ui/commits/CommitCard.tsx

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View } from "react-native";
import { withUniwind } from "uniwind";
import { FooterText } from "@/components/ui/text";

import { DigitalCommitItem } from "./DigitalCommitItem";

const UView = withUniwind(View);

type Props = {
	className?: string;
};

export function CommitCard({ className = "" }: Props) {
	return (
		<UView className={`w-full rounded-3xl bg-[#1A1A1A] px-5 py-5 ${className}`}>
			{/* APPLICATIONS */}
			<DigitalCommitItem
				title="Applications"
				items={[
					{
						id: "1",
						name: "AC Remote Control",
						icon: "https://i.imgur.com/VXW1bYJ.png",
					},
				]}
				icons={
					<>
						<MaterialCommunityIcons name="grid" size={18} color="#4FA0FF" />
						<FooterText className="ml-1 text-blue-400">0</FooterText>

						<MaterialCommunityIcons
							name="cellphone"
							size={18}
							color="#4FA0FF"
							style={{ marginLeft: 12 }}
						/>
						<FooterText className="ml-1 text-blue-400">1</FooterText>
					</>
				}
			/>

			{/* WEBSITES */}
			<DigitalCommitItem
				title="Websites"
				items={[
					{
						id: "w1",
						name: "youtube.com",
						icon: "https://www.google.com/s2/favicons?sz=64&domain=youtube.com",
					},
					{
						id: "w2",
						name: "facebook.com",
						icon: "https://www.google.com/s2/favicons?sz=64&domain=facebook.com",
					},
					{
						id: "w3",
						name: "instagram.com",
						icon: "https://www.google.com/s2/favicons?sz=64&domain=instagram.com",
					},
				]}
				icons={
					<>
						<MaterialCommunityIcons name="web" size={18} color="#4FA0FF" />
						<FooterText className="ml-1 text-blue-400">3</FooterText>
					</>
				}
			/>

			{/* DESCRIBE TO AI */}
			<DigitalCommitItem
				title="Describe to AI"
				items={[
					{
						id: "ai1",
						name: "Block all 18+ sites",
					},
					{
						id: "ai2",
						name: "Restrict social media during study time",
					},
				]}
				showBorder={false}
				icons={
					<>
						<MaterialCommunityIcons
							name="square-edit-outline"
							size={18}
							color="#4FA0FF"
						/>
						<FooterText className="ml-1 text-blue-400">2</FooterText>
					</>
				}
			/>
		</UView>
	);
}
