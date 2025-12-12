import { View, TouchableOpacity } from "react-native";
import { withUniwind } from "uniwind";
import { Ionicons } from "@expo/vector-icons";
import { FooterText } from "@/components/ui";
import { useRouter, usePathname } from "expo-router";

const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    {
      name: "Commits",
      icon: "shield-outline",
      path: "/(main)/commits",
    },
    {
      name: "Strict",
      icon: "lock-closed-outline",
      path: "/(main)/strict",
    },
    {
      name: "Insights",
      icon: "stats-chart-outline",
      path: "/(main)/insights",
    },
    {
      name: "Profile",
      icon: "person-outline",
      path: "/(main)/profile",
    },
  ];

  return (
    <UView className="flex-row py-4 pb-7 justify-around">
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;

        return (
          <UButton
            key={tab.name}
            className="items-center flex-1"
            onPress={() => router.push(tab.path)}
          >
            <Ionicons
              name={tab.icon}
              size={26}
              color={isActive ? "#4FA0FF" : "#9CA3AF"}
            />

            <FooterText
              className={isActive ? "text-[#4FA0FF]" : "text-gray-400"}
            >
              {tab.name}
            </FooterText>
          </UButton>
        );
      })}
    </UView>
  );
}
