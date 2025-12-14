// components/ui/commits/DigitalCommitItem.tsx

import { Image, Pressable, ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";
import { FooterText, HeaderTitle } from "@/components/ui/text";

const UView = withUniwind(View);
const UPress = withUniwind(Pressable);
const UScroll = withUniwind(ScrollView);

export type DigitalCommitItemType = {
	id: string;
	name: string;
	icon?: string;
};

type Props = {
	title: string;
	icons: React.ReactNode;
	items: DigitalCommitItemType[];
	showBorder?: boolean;
};

export function DigitalCommitItem({
	title,
	icons,
	items,
	showBorder = true,
}: Props) {
	return (
		<UPress className={`py-4 ${showBorder ? "border-[#2A2A2A] border-b" : ""}`}>
			{/* -------------------------------------------------- */}
			{/* TOP ROW — TITLE + RIGHT SIDE ICONS                 */}
			{/* -------------------------------------------------- */}
			<UView className="flex-row items-center justify-between">
				<HeaderTitle className="text-lg">{title}</HeaderTitle>
				<UView className="flex-row items-center">{icons}</UView>
			</UView>

			{/* -------------------------------------------------- */}
			{/* HORIZONTAL ITEM LIST                               */}
			{/* -------------------------------------------------- */}
			{items.length > 0 && (
				<UScroll
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ flexDirection: "row" }}
					className="mt-3"
				>
					{items.map((item) => (
						<UView key={item.id} className="mr-5 flex-row items-center">
							{/* Item Icon */}
							{item.icon && (
								<Image
									source={{ uri: item.icon }}
									style={{
										width: 32,
										height: 32,
										borderRadius: 8,
									}}
								/>
							)}

							{/* Item Label */}
							<FooterText className="ml-3 text-gray-400 text-sm">
								{item.name}
							</FooterText>
						</UView>
					))}
				</UScroll>
			)}
		</UPress>
	);
}
