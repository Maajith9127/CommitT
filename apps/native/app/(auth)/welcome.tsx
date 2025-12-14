import { api } from "@mono/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ImageBackground, Text, View } from "react-native";
import { AuthHeading, PrimaryButton, ScreenContainer } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export default function Welcome() {
	const router = useRouter();
	const [userName, setUserName] = useState<string>("User");
	const syncUserProfile = useMutation(api.auth.profile.syncUserProfile);
	const { data: session, isPending } = authClient.useSession();

	// Fetch user info when session is available
	useEffect(() => {
		if (session && !isPending) {
			const fetchUser = async () => {
				try {
					// Sync user profile to ensure users table record exists
					await syncUserProfile();

					if (session.user?.name) {
						setUserName(session.user.name);
					}
				} catch (err) {
					console.log("Error fetching user:", err);
				}
			};
			fetchUser();
		}
	}, [session, isPending, syncUserProfile]);

	if (isPending) {
		return (
			<ImageBackground
				source={require("../../assets/images/signinbg.png")}
				resizeMode="cover"
				style={{ flex: 1 }}
			>
				<ScreenContainer>
					<View className="flex-1 items-center justify-center">
						<Text className="text-white text-lg">Loading...</Text>
					</View>
				</ScreenContainer>
			</ImageBackground>
		);
	}

	return (
		<ImageBackground
			source={require("../../assets/images/signinbg.png")}
			resizeMode="cover"
			style={{ flex: 1 }}
		>
			<ScreenContainer>
				{/* TOP TEXT */}
				<View className="mt-12 items-center px-3">
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
				<View className="mx-4 mb-12">
					<PrimaryButton onPress={() => router.push("/(main)/commits")}>
						Take Control Of Your Life
					</PrimaryButton>
				</View>
			</ScreenContainer>
		</ImageBackground>
	);
}
