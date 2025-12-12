import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ImageBackground, Text, TouchableOpacity, View } from "react-native";
import {
	AuthFooterLegal,
	AuthHeading,
	Input,
	PrimaryButton,
	ScreenContainer,
} from "@/components/ui";
import { authClient } from "@/lib/auth-client";

// Dismiss any stale browser sessions on load
WebBrowser.maybeCompleteAuthSession();

type AuthMode = "signin" | "signup";

export default function Signin() {
	const router = useRouter();
	const [mode, setMode] = useState<AuthMode>("signin");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<{
		email?: string;
		password?: string;
		confirmPassword?: string;
		general?: string;
	}>({});

	// Validation functions
	const validateEmail = (email: string) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};

	const validateForm = () => {
		const newErrors: typeof errors = {};
		if (!email) {
			newErrors.email = "Email is required";
		} else if (!validateEmail(email)) {
			newErrors.email = "Please enter a valid email";
		}
		if (!password) {
			newErrors.password = "Password is required";
		} else if (password.length < 8) {
			newErrors.password = "Password must be at least 8 characters";
		}
		if (mode === "signup") {
			if (!confirmPassword) {
				newErrors.confirmPassword = "Please confirm your password";
			} else if (confirmPassword !== password) {
				newErrors.confirmPassword = "Passwords do not match";
			}
		}
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Handle form submission
	const handleEmailAuth = async () => {
		if (!validateForm()) return;

		setLoading(true);
		setErrors({});

		try {
			let result: any;
			if (mode === "signin") {
				result = await authClient.signIn.email({
					email,
					password,
				});
			} else {
				result = await authClient.signUp.email({
					email,
					password,
					name: email.split("@")[0], // Use email prefix as name
				});
			}

			if (result?.data) {
				console.log(`${mode === "signin" ? "Sign in" : "Sign up"} successful!`);
				router.replace("/(auth)/welcome");
			} else {
				setErrors({ general: "Authentication failed. Please try again." });
			}
		} catch (err: unknown) {
			console.log(`${mode} error:`, err);
			const errorMessage =
				(err as Error)?.message || "An error occurred. Please try again.";
			setErrors({ general: errorMessage });
		} finally {
			setLoading(false);
		}
	};

	// 🔵 Google Login - Opens browser for account selection
	const handleGoogle = async () => {
		try {
			// Warm up browser for faster OAuth
			await WebBrowser.warmUpAsync();

			const redirectUri = Linking.createURL("(auth)/welcome");
			console.log("🔵 Redirect URI:", redirectUri);

			const result = await authClient.signIn.social({
				provider: "google",
				callbackURL: redirectUri,
			});

			console.log("🔵 OAuth result:", result);

			// Cool down browser
			await WebBrowser.coolDownAsync();

			if (result?.data) {
				console.log("✅ Google login successful!");
				router.replace("/(auth)/welcome");
			}
		} catch (err) {
			console.log("❌ Google Login Error:", err);
			await WebBrowser.coolDownAsync();
		}
	};

	return (
		<ImageBackground
			source={require("../../assets/images/signinbg.png")}
			resizeMode="cover"
			style={{ flex: 1 }}
		>
			<ScreenContainer className="pt-30">
				{/* TITLE */}
				<AuthHeading className="mb-10 text-4xl">
					Get started with commitT
				</AuthHeading>

				{/* AUTH MODE TOGGLE */}
				<View className="mb-6 flex-row rounded-4xl bg-[#1A1A1A] p-1">
					<TouchableOpacity
						className={`flex-1 rounded-3xl px-4 py-3 ${mode === "signin" ? "bg-[#4FA0FF]" : ""}`}
						onPress={() => {
							setMode("signin");
							setErrors({});
						}}
					>
						<Text
							className={`text-center font-semibold text-lg ${mode === "signin" ? "text-white" : "text-gray-400"}`}
						>
							Sign In
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						className={`flex-1 rounded-3xl px-4 py-3 ${mode === "signup" ? "bg-[#4FA0FF]" : ""}`}
						onPress={() => {
							setMode("signup");
							setErrors({});
						}}
					>
						<Text
							className={`text-center font-semibold text-lg ${mode === "signup" ? "text-white" : "text-gray-400"}`}
						>
							Sign Up
						</Text>
					</TouchableOpacity>
				</View>

				{/* EMAIL INPUT */}
				<View className="mb-4">
					<Input
						placeholder="Email"
						value={email}
						onChangeText={(text) => {
							setEmail(text);
							if (errors.email) setErrors({ ...errors, email: undefined });
						}}
						keyboardType="email-address"
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{errors.email && (
						<Text className="mt-1 ml-4 text-red-400 text-sm">
							{errors.email}
						</Text>
					)}
				</View>

				{/* PASSWORD INPUT */}
				<View className="mb-4">
					<Input
						placeholder="Password"
						value={password}
						onChangeText={(text) => {
							setPassword(text);
							if (errors.password)
								setErrors({ ...errors, password: undefined });
						}}
						secureTextEntry
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{errors.password && (
						<Text className="mt-1 ml-4 text-red-400 text-sm">
							{errors.password}
						</Text>
					)}
				</View>

				{/* CONFIRM PASSWORD INPUT (SIGNUP ONLY) */}
				{mode === "signup" && (
					<View className="mb-6">
						<Input
							placeholder="Confirm Password"
							value={confirmPassword}
							onChangeText={(text) => {
								setConfirmPassword(text);
								if (errors.confirmPassword)
									setErrors({ ...errors, confirmPassword: undefined });
							}}
							secureTextEntry
							autoCapitalize="none"
							autoCorrect={false}
						/>
						{errors.confirmPassword && (
							<Text className="mt-1 ml-4 text-red-400 text-sm">
								{errors.confirmPassword}
							</Text>
						)}
					</View>
				)}

				{/* GENERAL ERROR */}
				{errors.general && (
					<Text className="mb-4 text-center text-red-400 text-sm">
						{errors.general}
					</Text>
				)}

				{/* SUBMIT BUTTON */}
				<PrimaryButton
					className="mb-6"
					onPress={loading ? undefined : handleEmailAuth}
				>
					{loading
						? "Please wait..."
						: mode === "signin"
							? "Continue"
							: "Sign Up"}
				</PrimaryButton>

				{/* DIVIDER */}
				<View className="mb-6 flex-row items-center">
					<View className="h-px flex-1 bg-gray-600" />
					<Text className="mx-4 text-gray-400">or</Text>
					<View className="h-px flex-1 bg-gray-600" />
				</View>

				{/* GOOGLE LOGIN */}
				<PrimaryButton className="mb-3 bg-[#1E1E1E]" onPress={handleGoogle}>
					Continue with Google
				</PrimaryButton>

				{/* SPACER */}
				<View className="mb-5 flex-1" />

				{/* FOOTER */}
				<AuthFooterLegal
					prefixText="By continuing, you accept our"
					privacyText="Privacy Policy"
					termsText="Terms & Conditions"
					onPressPrivacy={() => console.log("Privacy")}
					onPressTerms={() => console.log("Terms")}
					className="mb-5"
				/>
			</ScreenContainer>
		</ImageBackground>
	);
}
