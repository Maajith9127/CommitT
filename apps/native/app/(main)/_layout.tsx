import { Slot, Stack } from "expo-router";
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { BottomTabBar } from "@/components/ui/index";

const UView = withUniwind(View);
const UText = withUniwind(Text);

export default function MainLayout() {
  return (
    <UView className="flex-1 bg-black">
      {/* TOP NAVBAR */}
      <UView className="w-full flex-row items-center justify-between border-gray-800  bg-black px-6 py-4" />

      {/* MAIN SCREEN CONTENT */}
      <UView className="flex-1">
        <Slot />
      </UView>

      {/* BOTTOM TAB BAR */}
      <BottomTabBar />
    </UView>
  );
}
