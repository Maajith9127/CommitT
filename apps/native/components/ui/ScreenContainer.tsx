import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";
import { HeaderTitle } from "./text"; // using your existing titles

const UView = withUniwind(View);

// ------------------------------------------
// SCREEN CONTAINER (existing, untouched)
// ------------------------------------------
type ScreenContainerProps = {
	children: ReactNode;
	center?: boolean;
	className?: string;
};

export function ScreenContainer({
	children,
	center = false,
	className = "",
}: ScreenContainerProps) {
	const baseClasses = "flex-1 px-6 py-6 w-full";
	const centerClasses = center ? "justify-center items-center" : "";
	const combinedClasses = `${baseClasses} ${centerClasses} ${className}`.trim();

	return <UView className={combinedClasses}>{children}</UView>;
}

// ------------------------------------------
// SCREEN HEADER (new, added as you asked)
// ------------------------------------------
export function ScreenHeader({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<UView
			className={`bg-black pt-5 pr-4 pb-5 pl-4 ${className}
      `}
		>
			{children}
		</UView>
	);
}
