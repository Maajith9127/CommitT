import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { withUniwind } from "uniwind";
import { FooterText } from "@/components/ui/text";

const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    {
      name: "Commits",
      icon: "shield-outline",
      iconFilled: "shield",
      path: "/(main)/commits",
    },
    {
      name: "Strict",
      icon: "lock-closed-outline",
      iconFilled: "lock-closed",
      path: "/(main)/strict",
    },
    {
      name: "Insights",
      icon: "stats-chart-outline",
      iconFilled: "stats-chart",
      path: "/(main)/insights",
    },
    {
      name: "Profile",
      icon: "person-outline",
      iconFilled: "person",
      path: "/(main)/profile",
    },
  ];

  return (
    <UView className="flex-row justify-around py-4 pb-7">
      {tabs.map((tab) => {
        // pathname might be "/commits" or "/(main)/commits" depending on expo-router version
        const routeName = tab.path.split("/").pop(); // gets "commits", "strict", etc.
        const isActive = pathname.endsWith(routeName || "");

        return (
          <UButton
            key={tab.name}
            className="flex-1 items-center"
            onPress={() => router.push(tab.path)}
          >
            <Ionicons 
              name={isActive ? tab.iconFilled : tab.icon} 
              size={26} 
              color={isActive ? "#4FA0FF" : "#9CA3AF"} 
            />

            <FooterText className={isActive ? "text-[#4FA0FF]" : "text-gray-400"}>
              {tab.name}
            </FooterText>
          </UButton>
        );
      })}
    </UView>
  );
}
