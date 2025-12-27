import { useState, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { ScrollView, View, TouchableOpacity, Animated, Dimensions } from "react-native";
import { withUniwind } from "uniwind";
import { ScreenHeader } from "@/components/ui";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { AuthTitle, HeaderTitle, FooterText } from "@/components/ui/text";
import { PrimaryButton } from "@/components/ui/button";
import { DimmingOverlay } from "@/components/ui/overlay/DimmingOverlay";
import { AnimatedBottomSheet } from "@/components/ui/overlay/AnimatedBottomSheet";
import { CaptchaWaiverContent } from "@/components/ui/waivers/CaptchaWaiverContent";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
// The modal takes up 80% of the screen now
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.8;

export default function PenaltyWaiversScreen() {
	const router = useRouter();
	const [selectedWaiver, setSelectedWaiver] = useState<string | null>(null);
	
	// Slide animation
	const slideAnim = useRef(new Animated.Value(MODAL_HEIGHT)).current;
	// Fade animation for overlay
	const fadeAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (selectedWaiver) {
			// ANIMATE IN
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: 0,
					useNativeDriver: true,
					bounciness: 8,
					speed: 20,
				}),
				Animated.timing(fadeAnim, {
					toValue: 1, // Fully visible overlay
					duration: 300,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			// ANIMATE OUT
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: MODAL_HEIGHT,
					duration: 200,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 0, // Hide overlay
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [selectedWaiver]);

	const handleWaiverSelect = (waiver: string) => {
		setSelectedWaiver(waiver);
	};

	const handleClose = () => {
		setSelectedWaiver(null);
	};

	const handleConfirmCaptcha = (data: { count: number; difficulty: string }) => {
		router.push({ 
			pathname: "/(create-commit)/waiver-captcha", 
			params: { count: data.count, difficulty: data.difficulty } 
		});
	};

	const handleConfirmGeneric = () => {
		if (selectedWaiver === "paragraph") router.push("/(create-commit)/waiver-paragraph");
		if (selectedWaiver === "intense") router.push("/(create-commit)/waiver-intense");
		if (selectedWaiver === "run") router.push("/(create-commit)/waiver-run");
	};

	// Determine Modal Title based on selection
	const getModalTitle = () => {
		if (selectedWaiver === 'captcha') return 'Solve Captchas';
		return 'Selected Option';
	};

	return (
		<UView className="flex-1 bg-black">
			{/* FIXED HEADER */}
			<ScreenHeader>
				<HeaderTitle className="mt-16 text-3xl text-green-400">
					Penalty Waivers
				</HeaderTitle>

				<AuthTitle className="mt-1 mb-0 text-left text-gray-400">
					Choose how you want to EARN your penalty waiver
				</AuthTitle>
			</ScreenHeader>

			{/* SCROLLABLE CONTENT ONLY */}
			<UScroll 
				className="flex-1 mt-4 px-4"
				contentContainerStyle={{ paddingBottom: MODAL_HEIGHT + 20 }}
				showsVerticalScrollIndicator={false}
			>
				{/* 1 — SOLVE CAPTCHAS */}
				<ConditionCard
					icon="shield-check-outline"
					iconColor="#4CD964"
					title="Solve CAPTCHAs"
					subtitle="Solve a set number of CAPTCHAs to waive your penalty"
					onPress={() => handleWaiverSelect("captcha")}
					selected={selectedWaiver === "captcha"}
					selectionColor="#4CD964"
				/>

				{/* 2 — TYPE A LONG PARAGRAPH */}
				<ConditionCard
					icon="pencil-outline"
					iconColor="#4CD964"
					title="Write a Long Paragraph"
					subtitle="Type a 3000-word paragraph to earn a waiver"
					onPress={() => handleWaiverSelect("paragraph")}
					selected={selectedWaiver === "paragraph"}
					selectionColor="#4CD964"
				/>

				{/* 3 — REDO COMMITMENT WITH INTENSITY */}
				<ConditionCard
					icon="fire"
					iconColor="#4CD964"
					title="Redo With More Intensity"
					subtitle="Repeat tomorrow with a harder version"
					onPress={() => handleWaiverSelect("intense")}
					selected={selectedWaiver === "intense"}
					selectionColor="#4CD964"
				/>

				{/* 4 — RUN 5 KM */}
				<ConditionCard
					icon="run-fast"
					iconColor="#4CD964"
					title="Run 5 KM"
					subtitle="Choose a location and complete the run"
					onPress={() => handleWaiverSelect("run")}
					selected={selectedWaiver === "run"}
					selectionColor="#4CD964"
				/>
			</UScroll>

			{/* DIMMING OVERLAY */}
			<DimmingOverlay 
				opacity={fadeAnim} 
				visible={!!selectedWaiver} 
				onPress={handleClose} 
			/>

			{/* BOTTOM SHEET MODAL (ANIMATED) */}
			<AnimatedBottomSheet
				animValue={slideAnim}
				height={MODAL_HEIGHT}
				onClose={handleClose}
				title={getModalTitle()}
			>
				{selectedWaiver === "captcha" ? (
					<CaptchaWaiverContent onConfirm={handleConfirmCaptcha} />
				) : (
					// DEFAULT CONTENT FOR OTHERS
					<UView className="flex-1">
						<FooterText className="text-gray-400 mb-8">
							You have selected a waiver method. Confirm to proceed.
						</FooterText>
						<View className="flex-1 justify-end mb-8">
							<PrimaryButton onPress={handleConfirmGeneric}>
								Confirm Selection
							</PrimaryButton>
						</View>
					</UView>
				)}
			</AnimatedBottomSheet>
		</UView>
	);
}
