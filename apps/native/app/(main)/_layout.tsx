import { Slot, Stack } from "expo-router";
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { BottomTabBar } from "@/components/ui/index";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeaderTitle } from "@/components/ui/text";

const UView = withUniwind(View);
const UText = withUniwind(Text);

export default function MainLayout() {
  return (
    <UView className="flex-1 bg-black">
      {/* TOP NAVBAR - Sticky/Shared across all (main) screens */}
      <UView className="w-full flex-row items-center justify-between bg-black pt-14 pb-4 px-4">
         <UView className="flex-row items-center gap-2">
            <MaterialCommunityIcons name="rotate-orbit" size={30} color="white" />
            <HeaderTitle className="text-2xl text-white">CommitT</HeaderTitle>
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
