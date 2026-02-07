import { Slot, usePathname } from "expo-router"; // Added usePathname
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { BottomTabBar } from "@/components/ui/index";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeaderTitle } from "@/components/ui/text";

const UView = withUniwind(View);
const UText = withUniwind(Text);

export default function MainLayout() {
  const pathname = usePathname();

  // Determine header based on route
  const getHeaderConfig = () => {
    // Consistent Icon across all pages
    const icon = "rotate-orbit" as const;

    if (pathname.includes("/verify")) {
      return { title: "Verify", icon };
    }
    if (pathname.includes("/strict")) {
      return { title: "Strict Mode", icon };
    }
    if (pathname.includes("/insights")) {
      return { title: "Insights", icon };
    }
    if (pathname.includes("/profile")) {
      return { title: "Profile", icon };
    }
    // Default (Commits)
    return { title: "CommitT", icon };
  };

  const { title, icon } = getHeaderConfig();

  return (
    <UView className="flex-1 bg-black">
      {/* TOP NAVBAR - Sticky/Shared across all (main) screens */}
      <UView className="w-full flex-row items-center justify-between bg-black pt-14 pb-4 px-4">
         <UView className="flex-row items-center gap-2">
            <MaterialCommunityIcons name={icon} size={30} color="white" />
            <HeaderTitle className="text-2xl text-white">{title}</HeaderTitle>
         </UView>
         
         {/* Right side placeholder (e.g. notifications/settings icon could go here) */}
         <MaterialCommunityIcons name="bell-outline" size={24} color="#333" />
      </UView>

      {/* MAIN SCREEN CONTENT */}
      <UView className="flex-1 bg-black">
        <Slot />
      </UView>

      {/* BOTTOM TAB BAR */}
      <BottomTabBar />
    </UView>
  );
}
