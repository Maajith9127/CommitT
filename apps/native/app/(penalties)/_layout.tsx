import { Stack } from "expo-router";

export default function PenaltiesLayout() {
	return (
		<Stack
			screenOptions={{
				presentation: "modal",
				animation: "fade_from_bottom",
				headerShown: false,
			}}
		/>
	);
}



