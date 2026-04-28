import React, { useState } from "react";
import { View, TextInput, Pressable, KeyboardAvoidingView, Platform, Image, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";

import { ActionScreenLayout, HeaderTitle, BodyText, PrimaryButton } from "@/components/ui";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import { usePenaltySync } from "@/hooks/commits/usePenaltySync";

import { useFreshPhotoUrl } from "@/hooks/useFreshPhotoUrl";

// Styled Components
const UView = withUniwind(View);
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

  // RECOVERY LOGIC: Silently refresh expired signed URLs
  const freshUrl = useFreshPhotoUrl(config.storageId, config.photoUrl);

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
      {/* FIXED HEADER - Exact Spec */}
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
        <ActionScreenLayout
          paddingHorizontal={16}
          className="bg-black"
        >
          {/* FROM FIELD */}
          <UView className="flex-row items-center py-4 border-b border-[#1A1A1A]">
            <BodyText className="text-[#A0A0A0] w-20">From</BodyText>
            <BodyText className="flex-1 text-[#888]">forfeit@commit.com</BodyText>
          </UView>

          {/* TO FIELD - Direct Bind */}
          <UView className="flex-row items-center py-4 border-b border-[#1A1A1A]">
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
          <UView className="flex-row items-center py-4 border-b border-[#1A1A1A]">
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
          <UView className="flex-row items-start py-4 border-b border-[#1A1A1A] min-h-[120px]">
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

          <UView className="py-6">
            {/* INLINE IMAGE PREVIEW (X/Post Style) */}
            {freshUrl && (
              <UView className="relative w-full aspect-square rounded-2xl overflow-hidden border border-[#333] bg-[#1A1A1A]">
                <UImage source={{ uri: freshUrl }} className="w-full h-full" resizeMode="cover" />
                
                {/* Close Button Overlay */}
                <UPressable 
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 items-center justify-center"
                  onPress={() => syncToDraft({ photoUrl: null })} 
                >
                  <MaterialCommunityIcons name="close" size={20} color="white" />
                </UPressable>
              </UView>
            )}

          </UView>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* HARD VISUAL SEPARATOR */}
          {/* ───────────────────────────────────────────────────────────── */}
          <UView className="w-full h-[1px] bg-[#222] my-8" />

          {/* TEST RECEIVER SANDBOX CARD */}
          <UView className="bg-[#1A1A1A] border border-[#222] rounded-3xl px-4 py-5 mb-12">
            <UView className="mb-4">
              <HeaderTitle className="text-xl text-[#E3E3E3]">Test the receiver</HeaderTitle>
              <BodyText className="text-[#888] text-sm mt-1">
                Preview how the email will look in their inbox.
              </BodyText>
            </UView>

            {/* FROM FIELD (TEST) */}
            <UView className="flex-row items-center py-4 border-b border-[#2A2A2A]">
              <BodyText className="text-[#A0A0A0] w-20">From</BodyText>
              <BodyText className="flex-1 text-[#888]">forfeit@commit.com</BodyText>
            </UView>

            {/* TO FIELD (TEST) */}
            <UView className="flex-row items-center py-4 border-b border-[#2A2A2A]">
              <BodyText className="text-[#A0A0A0] w-20">To</BodyText>
              <UTextInput
                value={config.emailTo || "friend@example.com"}
                editable={false}
                placeholderTextColor="#444"
                className="flex-1 text-[#888] text-base py-0"
              />
            </UView>

            {/* SUBJECT FIELD (TEST) */}
            <UView className="flex-row items-center py-4 border-b border-[#2A2A2A]">
              <BodyText className="text-[#A0A0A0] w-20">Subject</BodyText>
              <UTextInput
                value="beta test"
                editable={false}
                placeholderTextColor="#444"
                className="flex-1 text-[#888] text-base py-0 font-medium"
              />
            </UView>

            {/* MESSAGE AREA (TEST) */}
            <UView className="flex-row items-start pt-4">
              <BodyText className="text-[#A0A0A0] w-20 mt-1">Message</BodyText>
              <UTextInput
                value="test message"
                editable={false}
                multiline
                textAlignVertical="top"
                className="flex-1 text-[#888] text-base py-0 leading-6"
              />
            </UView>
            
            <PrimaryButton 
              className="mt-8 mb-2 h-14" 
              onPress={() => console.log("Test Now")}
            >
              Test Now
            </PrimaryButton>
          </UView>

        </ActionScreenLayout>
      </UKeyboardAvoidingView>
    </UView>
  );
}
