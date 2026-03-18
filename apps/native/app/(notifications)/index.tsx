import React from "react";
import { View, Text, Pressable } from "react-native";
import { withUniwind } from "uniwind";
import { Stack, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const UView = withUniwind(View);
const UText = withUniwind(Text);

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <UView className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false }} />
      
      <UView className="w-full flex-row items-center justify-between bg-black pt-14 pb-4 px-4 border-b border-[#333]">
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
        </Pressable>
        <UText className="text-white text-xl font-bold">Notifications</UText>
        <UView className="w-9" />
      </UView>

      <UView className="flex-1 items-center justify-center">
        <UText className="text-gray-400 text-lg">Notifications</UText>
      </UView>
    </UView>
  );
}
