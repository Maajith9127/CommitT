import { View, ScrollView } from "react-native";
import { withUniwind } from "uniwind";
import { HeaderTitle, AuthTitle } from "@/components/ui/text";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { ScreenHeader } from "@/components/ui";
import { useRouter } from "expo-router";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

export default function PenaltiesScreen() {
    const router = useRouter();

    return (
        <UView className="flex-1 bg-black">
            {/* HEADER */}
            <ScreenHeader>
                <HeaderTitle className="text-red-400 text-3xl mt-16">
                    Penalties
                </HeaderTitle>

                <AuthTitle className="text-left text-gray-400 mt-1 mb-0">
                    Choose what consequence activates when you fail
                </AuthTitle>
            </ScreenHeader>

            {/* SCROLL CONTENT */}
            <UScroll className="px-4 mt-4">

                {/* 1 — MONEY PENALTY */}
                <ConditionCard
                    icon="currency-inr"
                    iconColor="#FF3B30"
                    title="Money Penalty"
                    subtitle="Lose a fixed amount when you miss"
                    onPress={() => router.push("/(create-commit)/penalty-money")}
                />

                {/* 2 — EMBARRASSING PHOTO */}
                <ConditionCard
                    icon="camera-enhance-outline"
                    iconColor="#FF3B30"
                    title="Embarrassing Photo"
                    subtitle="Send a cringe picture to someone"
                    onPress={() => router.push("/(create-commit)/penalty-photo")}
                />

                {/* 3 — CRINGE MESSAGE */}
                <ConditionCard
                    icon="message-alert-outline"
                    iconColor="#FF3B30"
                    title="Cringe Message"
                    subtitle="A shameful message gets sent to a contact"
                    onPress={() => router.push("/(create-commit)/penalty-message")}
                />

                {/* 4 — BLOCK FAVOURITE APP */}
                <ConditionCard
                    icon="cellphone-off"
                    iconColor="#FF3B30"
                    title="Block Favourite App"
                    subtitle="Your chosen app gets blocked temporarily"
                    onPress={() => router.push("/(create-commit)/penalty-blockapp")}
                />

            </UScroll>
        </UView>
    );
}
