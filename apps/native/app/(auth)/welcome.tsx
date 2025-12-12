import { View, Image, ImageBackground, Text } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { ScreenContainer, PrimaryButton, AuthHeading } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { api } from "@mono/backend/convex/_generated/api";

export default function Welcome() {
	const router = useRouter();
	const [userName, setUserName] = useState<string>("User");
	const syncUserProfile = useMutation(api.auth.profile.syncUserProfile);

	// Fetch user info on mount
	useEffect(() => {
		const fetchUser = async () => {
			try {
				// Sync user profile to ensure users table record exists
				await syncUserProfile();

				const session = await authClient.getSession();
				if (session?.data?.user?.name) {
					setUserName(session.data.user.name);
				}
			} catch (err) {
				console.log("Error fetching user:", err);
			}
		};
		fetchUser();
	}, [syncUserProfile]);

	return (
		<ImageBackground
			source={require("../../assets/images/signinbg.png")}
			resizeMode="cover"
			style={{ flex: 1 }}
		>
			<ScreenContainer>
				{/* TOP TEXT */}
				<View className="mt-12 px-3 items-center">
					<AuthHeading>
						Welcome to CommitT{" "}
						<Text style={{ color: "#4FA0FF" }}>{userName}</Text>
					</AuthHeading>
				</View>

				{/* BIG CENTER LOGO / ANIMATION */}
				<View className="items-center">
					<Image
						source={require("../../assets/images/logo.png")}
						style={{ width: 430, height: 430, marginVertical: 10 }}
						resizeMode="contain"
					/>
				</View>

				{/* Spacer (pushes button to bottom) */}
				<View className="flex-1" />

				{/* MAIN CTA BUTTON */}
				<View className="mb-12 mx-4">
					<PrimaryButton onPress={() => router.push("/(main)/commits")}>
						Take Control Of Your Life
					</PrimaryButton>
				</View>
			</ScreenContainer>
		</ImageBackground>
	);
}
