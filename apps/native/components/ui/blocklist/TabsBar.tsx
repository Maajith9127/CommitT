import { View, Pressable } from "react-native";
import { withUniwind } from "uniwind";
import { AuthTitle } from "@/components/ui/text";

const UView = withUniwind(View);
const UPress = withUniwind(Pressable);

type Tab = {
    key: string;
    label: string;
};

type TabsBarProps = {
    tabs: Tab[];
    activeTab: string;
    onChange: (key: string) => void;
};

export function TabsBar({ tabs, activeTab, onChange }: TabsBarProps) {
    return (
        <UView className="flex-row border-b border-[#2A2A2A] -mx-4">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.key;

                return (
                    <UPress key={tab.key} onPress={() => onChange(tab.key)} className="flex-1">
                        <UView
                            className={`py-3 items-center border-b-2 ${isActive ? "border-blue-500" : "border-transparent"}`}
                        >
                            <AuthTitle
                                className={`mb-0 text-xl font-medium ${isActive ? "text-blue-400" : "text-gray-400"}`}
                            >
                                {tab.label}
                            </AuthTitle>
                        </UView>
                    </UPress>
                );
            })}
        </UView>
    );
}
