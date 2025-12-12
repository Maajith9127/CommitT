// components/ui/commits/DigitalCommitItem.tsx

import { View, Pressable, Image, ScrollView } from "react-native";
import { withUniwind } from "uniwind";
import { HeaderTitle, FooterText } from "@/components/ui/text";

const UView = withUniwind(View);
const UPress = withUniwind(Pressable);
const UScroll = withUniwind(ScrollView);

export type DigitalCommitItemType = {
    id: string;
    name: string;
    icon?: string;
};

type Props = {
    title: string;
    icons: React.ReactNode;
    items: DigitalCommitItemType[];
    showBorder?: boolean;
};

export function DigitalCommitItem({
    title,
    icons,
    items,
    showBorder = true,
}: Props) {
    return (
        <UPress className={`py-4 ${showBorder ? "border-b border-[#2A2A2A]" : ""}`}>

            {/* -------------------------------------------------- */}
            {/* TOP ROW — TITLE + RIGHT SIDE ICONS                 */}
            {/* -------------------------------------------------- */}
            <UView className="flex-row justify-between items-center">
                <HeaderTitle className="text-lg">{title}</HeaderTitle>
                <UView className="flex-row items-center">{icons}</UView>
            </UView>

            {/* -------------------------------------------------- */}
            {/* HORIZONTAL ITEM LIST                               */}
            {/* -------------------------------------------------- */}
            {items.length > 0 && (
                <UScroll
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ flexDirection: "row" }}
                    className="mt-3"
                >
                    {items.map((item) => (
                        <UView key={item.id} className="flex-row items-center mr-5">

                            {/* Item Icon */}
                            {item.icon && (
                                <Image
                                    source={{ uri: item.icon }}
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                    }}
                                />
                            )}

                            {/* Item Label */}
                            <FooterText className="text-gray-400 text-sm ml-3">
                                {item.name}
                            </FooterText>

                        </UView>
                    ))}
                </UScroll>
            )}
        </UPress>
    );
}
