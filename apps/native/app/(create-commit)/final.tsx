import { useState } from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { withUniwind } from "uniwind";

import { PrimaryButton, AddButton, Input } from "@/components/ui";
import { HeaderTitle } from "@/components/ui/text";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { CommitCard } from "@/components/ui/commits/DigitalCommitment";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";



const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);


type Condition = {
    id: string;
    icon: string;
    title: string;
    subtitle: string;
};

export default function FinalScreen() {
    const router = useRouter();
    const { width: screenWidth } = useWindowDimensions();

    const horizontalPadding = 16;
    const peekWidth = 40;

    const [conditions] = useState<Condition[]>([
        { id: "1", icon: "clock-outline", title: "Time", subtitle: "1:40am – 3:40am" },
        { id: "2", icon: "map-marker-outline", title: "Location", subtitle: "Not set" },
        { id: "3", icon: "account-check-outline", title: "Partner", subtitle: "None selected" },
        { id: "4", icon: "camera-outline", title: "Picture", subtitle: "Not added" },
        { id: "5", icon: "video-outline", title: "Video", subtitle: "Not added" },
    ]);

    const cardWidth =
        conditions.length === 1
            ? screenWidth - horizontalPadding * 2
            : screenWidth - horizontalPadding * 2 - peekWidth;

    return (
        <UView className="flex-1 bg-black px-4 pt-20">

            {/* MAIN SCROLL AREA */}
            <UScroll showsVerticalScrollIndicator={false} className="flex-1">

                {/* TOP — EMOJI + NAME INPUT */}
                <UView className="items-center mb-10">
                    <MaterialCommunityIcons
                        name="book"             //  choose icon you want
                        size={75}                 // same style as CommitCard
                        color="#4FA0FF"
                        style={{ marginBottom: 16 }}
                    />


                    <Input placeholder="Commitment Name" />
                </UView>

                {/* CONDITIONS HEADER */}
                <UView className="flex-row items-center justify-between mb-3">
                    <HeaderTitle>Conditions</HeaderTitle>
                    <AddButton onPress={() => { }} />
                </UView>

                {/* HORIZONTAL CONDITION CARDS */}
                <UScroll
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row mb-3"
                >
                    {conditions.map((condition, index) => (
                        <ConditionCard
                            key={condition.id}
                            icon={condition.icon}
                            title={condition.title}
                            subtitle={condition.subtitle}
                            width={cardWidth}
                            className={`h-24 ${index < conditions.length - 1 ? "mr-3" : ""}`}
                        />
                    ))}
                </UScroll>

                {/* DIGITAL COMMITMENT HEADER */}
                <UView className=" mb-3">
                    <HeaderTitle>Digital Commitment</HeaderTitle>
                </UView>

                {/* EMPTY COMMIT CARDS */}
                <CommitCard className=" mb-5" />



                {/* PENALTIES HEADER */}
                <UView className="mb-3 mt-2">
                    <HeaderTitle>Penalties</HeaderTitle>
                </UView>

                {/* PENALTY CARD */}
                <ConditionCard
                    icon="alert-circle-outline"
                    iconColor="#FF3B30"
                    title="Penalty"
                    subtitle="₹500 will be deducted if you miss this commitment"
                    onPress={() => router.push("/(create-commit)/penalties")}
                    className="h-28 border-[3px] pb-4 border-red-500"
                />



                {/* PENALTY WAIVER HEADER */}
                <UView className="mb-3 mt-3">
                    <HeaderTitle>Penalty Waiver</HeaderTitle>
                </UView>

                {/* PENALTY WAIVER CARD */}
                <ConditionCard
                    icon="check-decagram-outline"
                    iconColor="#4CD964"
                    title="Penalty Waiver"
                    subtitle="Solve 100 CAPTCHAs to waive the penalty"
                    onPress={() => router.push("/(create-commit)/penaltywaivers")}
                    className="h-28 border-[3px] pb-4 border-[#4CD964]"
                />


            </UScroll>

            {/* FIXED FOOTER BUTTON */}
            <UView className="mb-10">
                <PrimaryButton onPress={() => router.push("/(settings)/permissions")}>
                    CommitT
                </PrimaryButton>
            </UView>

        </UView>
    );
}
