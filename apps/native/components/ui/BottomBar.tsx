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
      path: "/commits",
    },
    {
      name: "Verify",
      icon: "checkbox-outline",     
      iconFilled: "checkbox",       
      path: "/verify",       
    },
    {
      name: "Strict",
      icon: "lock-closed-outline",
      iconFilled: "lock-closed",
      path: "/strict",
    },
    {
      name: "Insights",
      icon: "stats-chart-outline",
      iconFilled: "stats-chart",
      path: "/insights",
    },
    {
      name: "Profile",
      icon: "person-outline",
      iconFilled: "person",
      path: "/profile",
    },
  ];

  return (
    <UView className="flex-row justify-around py-4 pb-7">
      {tabs.map((tab) => {
        // With Expo Router groups, pathname often doesn't match the simplified path
        // e.g., pathname might be "/(main)/commits" while path is "/commits"
        // We need a robust check.
        const isActive = pathname.includes(tab.path) || pathname === tab.path || pathname.endsWith(tab.path);

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
