import { Ionicons } from "@expo/vector-icons";
import { api } from "@mono/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { Card, Chip, useThemeColor } from "heroui-native";
import { Text, View } from "react-native";
import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";

export default function Home() {
	const healthCheck = useQuery(api.healthCheck.get);
	const { isAuthenticated } = useConvexAuth();
	const user = useQuery(
		api.auth.auth.getCurrentUser,
		isAuthenticated ? {} : "skip",
	);
	const mutedColor = useThemeColor("muted");
	const successColor = useThemeColor("success");
	const dangerColor = useThemeColor("danger");

	const isConnected = healthCheck === "OK";
	const isLoading = healthCheck === undefined;

	return (
		<Container className="p-6">
			<View className="mb-6 py-4">
				<Text className="mb-2 font-bold text-4xl text-foreground">
					BETTER T STACK
				</Text>
			</View>
		</Container>
	);
}
