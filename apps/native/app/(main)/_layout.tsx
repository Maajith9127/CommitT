import { Stack, Slot } from "expo-router";
import { View, Text } from "react-native";
import { withUniwind } from "uniwind";
import { BottomTabBar } from "@/components/ui/index";

const UView = withUniwind(View);
const UText = withUniwind(Text);

export default function MainLayout() {
  return (
    <UView className="flex-1 bg-black">
      {/* TOP NAVBAR */}
      <UView
        className="
          w-full 
          flex-row 
          items-center 
          justify-between 
          px-6 
          py-4 
          bg-black 
          border-b 
          border-gray-800
        "
      >
     
      </UView>

      {/* MAIN SCREEN CONTENT */}
      <UView className="flex-1">
        <Slot />
      </UView>

      {/* BOTTOM TAB BAR */}
      <BottomTabBar />
    </UView>
  );
}
