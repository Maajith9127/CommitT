import { useRouter } from "expo-router";
import { Image, ImageBackground, View } from "react-native";
import {
	AuthFooterLegal,
	AuthHeading,
	AuthMemberPrompt,
	AuthTitle,
	PrimaryButton,
	ScreenContainer,
} from "@/components/ui";

export default function AuthIndex() {
	const router = useRouter();

	return (
		<ImageBackground
			source={require("../../assets/images/onboarding.png")}
			resizeMode="cover"
			style={{ flex: 1 }}
		>
			<ScreenContainer className="">
				{/* TOP TEXT */}
				<View className="mt-9 items-center px-3">
					<AuthTitle>Welcome to CommitT</AuthTitle>

					<AuthHeading>Regain control over your habit loops</AuthHeading>
				</View>

				{/* LOGO IN THE MIDDLE */}
				<View className="mb-1 items-center">
					<Image
						source={require("../../assets/images/logo.png")}
						style={{
							width: 370,
							height: 370,
							marginVertical: 10,
						}}
						resizeMode="contain"
					/>
				</View>

				{/* Spacer pushes footer down */}
				<View className="flex-1" />

				{/* BUTTON */}
				<View className="mb-6">
					<PrimaryButton onPress={() => router.push("/(auth)/signin")}>
						Let's Go!!
					</PrimaryButton>
				</View>

				{/* Already member? */}
				<AuthMemberPrompt text="Already a member?" className="mb-5" />

				{/* Footer */}
				<AuthFooterLegal
					prefixText="By continuing, you accept our"
					privacyText="Privacy Policy"
					termsText="Terms & Conditions"
					onPressPrivacy={() => console.log("Privacy")}
					onPressTerms={() => console.log("Terms")}
					className="mb-12"
				/>
			</ScreenContainer>
		</ImageBackground>
	);
}
