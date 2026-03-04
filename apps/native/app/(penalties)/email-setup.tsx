import React, { useState } from "react";
import { View, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform, Image, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { HeaderTitle, BodyText } from "@/components/ui/text";

const UView = withUniwind(View);
const UScrollView = withUniwind(ScrollView);
const UPressable = withUniwind(Pressable);
const UTextInput = withUniwind(TextInput);
const UImage = withUniwind(Image);
const UText = withUniwind(Text);
const UKeyboardAvoidingView = withUniwind(KeyboardAvoidingView);

export default function EmailSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const photoUri = params.photoUri as string | undefined;
  const description = params.description as string | undefined;

  const [to, setTo] = useState("friend@example.com");
  const [subject, setSubject] = useState("I failed my commitment!");
  const [body, setBody] = useState(description || "");

  const handleSend = () => {
    // Logic to save settings and go back
    console.log("Email Config Saved:", { to, subject, body });
    router.back();
  };

  return (
    <UView className="flex-1 bg-black">
      {/* GMAIL HEADER */}
      <UView className="flex-row items-center justify-between px-4 py-4 pt-12">
        <UView className="flex-row items-center">
          <UPressable onPress={() => router.back()} className="mr-6">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#E3E3E3" />
          </UPressable>
          <HeaderTitle className="text-xl">Preview</HeaderTitle>
        </UView>

        <UView className="flex-row items-center gap-6">
          <MaterialCommunityIcons name="attachment" size={24} color="#E3E3E3" />
          <UPressable onPress={handleSend}>
            <MaterialCommunityIcons name="send" size={24} color="#E3E3E3" />
          </UPressable>
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#E3E3E3" />
        </UView>
      </UView>

      <UKeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <UScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <UView className="flex-row items-center px-4 py-4 border-b border-[#1A1A1A]">
            <BodyText className="text-[#A0A0A0] w-20">From</BodyText>
            <BodyText className="flex-1 text-[#888]">forfeit@commit.com</BodyText>
          </UView>

          {/* TO FIELD */}
          <UView className="flex-row items-center px-4 py-4 border-b border-[#1A1A1A]">
            <BodyText className="text-[#A0A0A0] w-20">To</BodyText>
            <UTextInput
              value={to}
              onChangeText={setTo}
              placeholderTextColor="#444"
              className="flex-1 text-white text-base py-0"
              autoCapitalize="none"
              multiline={false}
            />
            <MaterialCommunityIcons name="chevron-down" size={20} color="#A0A0A0" />
          </UView>

          {/* SUBJECT FIELD */}
          <UView className="flex-row items-center px-4 py-4 border-b border-[#1A1A1A]">
            <BodyText className="text-[#A0A0A0] w-20">Subject</BodyText>
            <UTextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Add a subject"
              placeholderTextColor="#444"
              className="flex-1 text-white text-base py-0 font-medium"
            />
          </UView>

          {/* COMPOSE AREA */}
          <UView className="flex-row items-start px-4 py-4 border-b border-[#1A1A1A] min-h-[120px]">
            <BodyText className="text-[#A0A0A0] w-20 mt-1">Message</BodyText>
            <UTextInput
              value={body}
              onChangeText={setBody}
              placeholder="Start typing..."
              placeholderTextColor="#444"
              multiline
              textAlignVertical="top"
              className="flex-1 text-white text-base py-0 leading-6"
            />
          </UView>

          <UView className="px-4 py-6">

            {/* INLINE IMAGE PREVIEW (X/Post Style) */}
            {photoUri && (
              <UView className="relative w-full aspect-square rounded-2xl overflow-hidden border border-[#333] bg-[#1A1A1A]">
                <UImage source={{ uri: photoUri }} className="w-full h-full" resizeMode="cover" />
                
                {/* Close Button Overlay */}
                <UPressable 
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 items-center justify-center"
                  onPress={() => {}} 
                >
                  <MaterialCommunityIcons name="close" size={20} color="white" />
                </UPressable>

                {/* Bottom Action Overlays */}
                <UView className="absolute bottom-3 right-3 flex-row gap-2">
                   <UView className="w-8 h-8 rounded-full bg-black/60 items-center justify-center">
                    <UText className="text-white text-[10px] font-bold">ALT</UText>
                   </UView>
                   <UView className="w-8 h-8 rounded-full bg-black/60 items-center justify-center">
                    <MaterialCommunityIcons name="dots-vertical" size={18} color="white" />
                   </UView>
                </UView>
              </UView>
            )}
            
            {/* TAGGING & LOCATION */}
            {photoUri && (
              <UView className="mt-4 gap-3">
                <UPressable className="flex-row items-center px-3 py-1.5 bg-[#0F1419] border border-[#333] rounded-full self-start">
                  <BodyText className="text-[#4FA0FF] text-xs font-semibold">Tag people</BodyText>
                </UPressable>
                <UView className="flex-row items-center">
                  <MaterialCommunityIcons name="map-marker-outline" size={16} color="#8E8E93" />
                  <BodyText className="text-[#8E8E93] text-xs ml-1">Add location</BodyText>
                </UView>
              </UView>
            )}
          </UView>
        </UScrollView>
      </UKeyboardAvoidingView>
    </UView>
  );
}
