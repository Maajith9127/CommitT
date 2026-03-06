/**
 * @file EmailSetupScreen.tsx
 * @description Detailed configuration for the "Email Blast" delivery channel.
 * 
 * DESIGN: X/Post & Gmail inspired high-fidelity preview with Inline Image support.
 * LOGIC: Directly bound to Zustand store for real-time synchronization.
 */

import React from "react";
import { View, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform, Image, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";

import { HeaderTitle, BodyText } from "@/components/ui/text";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import { usePenaltySync } from "@/hooks/commits/usePenaltySync";
import { useState } from "react";

// Styled Components
const UView = withUniwind(View);
const UScrollView = withUniwind(ScrollView);
const UPressable = withUniwind(Pressable);
const UTextInput = withUniwind(TextInput);
const UImage = withUniwind(Image);
const UText = withUniwind(Text);
const UKeyboardAvoidingView = withUniwind(KeyboardAvoidingView);

export default function EmailSetupScreen() {
  const router = useRouter();
  
  // DIRECT SYNC: Continuous connection to Zustand store
  const { draft, syncToDraft } = usePenaltySync();
  const config = draft.penalty?.config || {};

  // Local UI State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");

  const handleDone = () => {
    // Basic validation for Email channel
    if (!config.emailTo || !config.emailTo.includes("@")) {
      setModalTitle("Please enter a valid recipient email address.");
      setModalVisible(true);
      return;
    }

    if (!config.emailSubject || config.emailSubject.trim().length === 0) {
      setModalTitle("Please provide a subject for the email blast.");
      setModalVisible(true);
      return;
    }

    router.back();
  };

  return (
    <UView className="flex-1 bg-black">
      {/* HEADER - Exact Spec */}
      <UView className="flex-row items-center justify-between px-4 py-4 pt-12">
        <UView className="flex-row items-center">
          <UPressable onPress={() => router.back()} className="mr-6">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#E3E3E3" />
          </UPressable>
          <HeaderTitle className="text-xl text-[#E3E3E3]">Preview</HeaderTitle>
        </UView>

        <UView className="flex-row items-center gap-6">
          <MaterialCommunityIcons name="attachment" size={24} color="#E3E3E3" />
          <UPressable onPress={handleDone}>
            <MaterialCommunityIcons name="send" size={24} color="#E3E3E3" />
          </UPressable>
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#E3E3E3" />
        </UView>
      </UView>

      <ConfirmationModal
        visible={modalVisible}
        title={modalTitle}
        confirmText="Got it"
        singleButton={true}
        onConfirm={() => setModalVisible(false)}
        onCancel={() => setModalVisible(false)}
      />

      <UKeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <UScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* FROM FIELD */}
          <UView className="flex-row items-center px-4 py-4 border-b border-[#1A1A1A]">
            <BodyText className="text-[#A0A0A0] w-20">From</BodyText>
            <BodyText className="flex-1 text-[#888]">forfeit@commit.com</BodyText>
          </UView>

          {/* TO FIELD - Direct Bind */}
          <UView className="flex-row items-center px-4 py-4 border-b border-[#1A1A1A]">
            <BodyText className="text-[#A0A0A0] w-20">To</BodyText>
            <UTextInput
              value={config.emailTo || ""}
              onChangeText={(text) => syncToDraft({ emailTo: text })}
              placeholder="friend@example.com"
              placeholderTextColor="#444"
              className="flex-1 text-white text-base py-0"
              autoCapitalize="none"
              multiline={false}
            />
            <MaterialCommunityIcons name="chevron-down" size={20} color="#A0A0A0" />
          </UView>

          {/* SUBJECT FIELD - Direct Bind */}
          <UView className="flex-row items-center px-4 py-4 border-b border-[#1A1A1A]">
            <BodyText className="text-[#A0A0A0] w-20">Subject</BodyText>
            <UTextInput
              value={config.emailSubject || "I failed my commitment!"}
              onChangeText={(text) => syncToDraft({ emailSubject: text })}
              placeholder="Add a subject"
              placeholderTextColor="#444"
              className="flex-1 text-white text-base py-0 font-medium"
            />
          </UView>

          {/* MESSAGE AREA - Direct Bind to description */}
          <UView className="flex-row items-start px-4 py-4 border-b border-[#1A1A1A] min-h-[120px]">
            <BodyText className="text-[#A0A0A0] w-20 mt-1">Message</BodyText>
            <UTextInput
              value={config.description || ""}
              onChangeText={(text) => syncToDraft({ description: text, emailBody: text })}
              placeholder="Start typing..."
              placeholderTextColor="#444"
              multiline
              textAlignVertical="top"
              className="flex-1 text-white text-base py-0 leading-6"
            />
          </UView>

          <UView className="px-4 py-6">
            {/* INLINE IMAGE PREVIEW (X/Post Style) */}
            {config.photoUrl && (
              <UView className="relative w-full aspect-square rounded-2xl overflow-hidden border border-[#333] bg-[#1A1A1A]">
                <UImage source={{ uri: config.photoUrl }} className="w-full h-full" resizeMode="cover" />
                
                {/* Close Button Overlay */}
                <UPressable 
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 items-center justify-center"
                  onPress={() => syncToDraft({ photoUrl: null })} 
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
            
            {/* TAGGING & LOCATION PREVIEWS */}
            {config.photoUrl && (
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
