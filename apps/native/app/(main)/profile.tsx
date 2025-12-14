import { Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UView = withUniwind(View);
const UText = withUniwind(Text);

export default function ProfileScreen() {
	return (
		<UView className="flex-1 bg-black px-6 py-4">
			<UText className="text-white text-xl">Your Profile</UText>
		</UView>
	);
}
