import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { withUniwind } from "uniwind";
import { FooterText, HeaderTitle } from "@/components/ui/text";

const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);

export type ConditionCardProps = {
	icon: string;
	title: string;
	subtitle: string;
	onPress?: () => void;
	className?: string;
	width?: number;
	iconColor?: string;
	titleColor?: string;
	selected?: boolean;
	selectionColor?: string;
};

export function ConditionCard({
	icon,
	title,
	subtitle,
	onPress,
	className = "",
	width,
	iconColor = "#4FA0FF",
	titleColor = "#FFFFFF",
	selected = false,
	selectionColor = "#4FA0FF",
}: ConditionCardProps) {
	return (
		<UButton
			onPress={onPress}
			style={[
				width ? { width } : undefined,
				selected ? { borderWidth: 3, borderColor: selectionColor } : undefined,
			]}
			className={`mb-4 rounded-3xl bg-[#1A1A1A] px-4 py-4 ${className}`}
			activeOpacity={0.8}
		>
			<UView className="flex-row items-center">
				{/* ICON */}
				<MaterialCommunityIcons
					name={icon}
					size={30}
					color={iconColor}
					style={{ marginRight: 12 }}
				/>

				{/* TITLE + SUBTITLE */}
				<UView className="flex-1">
					<HeaderTitle
						className="text-lg"
						style={{ color: titleColor }}
					>
						{title}
					</HeaderTitle>

					<FooterText className="mt-1 text-gray-400 text-sm">
						{subtitle}
					</FooterText>
				</UView>
			</UView>
		</UButton>
	);
}
