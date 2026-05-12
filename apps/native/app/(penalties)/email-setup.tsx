import React, { useState } from "react";
import { View, TextInput, Pressable, KeyboardAvoidingView, Platform, Image, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";
import { useAction } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";

import { ActionScreenLayout, HeaderTitle, BodyText, PrimaryButton } from "@/components/ui";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import { usePenaltySync } from "@/hooks/commits/usePenaltySync";
import { THEME } from "@/constants/theme";

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
  
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Backend Action
  const sendTestEmail = useAction(api.api.notifications.test_email.sendTestEmail);

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
    <UView className="flex-1" style={{ backgroundColor: THEME.colors.pureBlack }}>
      {/* FIXED HEADER - Exact Spec */}
      <UView className="flex-row items-center justify-between px-4 py-4 pt-12">
        <UView className="flex-row items-center">
          <UPressable onPress={() => router.back()} className="mr-6">
            <MaterialCommunityIcons name="arrow-left" size={24} color={THEME.colors.textMain} />
          </UPressable>
          <HeaderTitle className="text-xl" style={{ color: THEME.colors.textMain }}>Preview</HeaderTitle>
        </UView>

        <UView className="flex-row items-center gap-6">
          <MaterialCommunityIcons name="attachment" size={24} color={THEME.colors.textMain} />
          <UPressable onPress={handleDone}>
            <MaterialCommunityIcons name="send" size={24} color={THEME.colors.textMain} />
          </UPressable>
          <MaterialCommunityIcons name="dots-vertical" size={24} color={THEME.colors.textMain} />
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

      <ConfirmationModal
        visible={testModalVisible}
        title={`A test message with text "test message" will be sent to ${config.emailTo || "the receiver"}. Don't worry, this will just be a test message. Your penalty images or anything else won't be sent.`}
        confirmText="Test Now"
        cancelText="Cancel"
        isLoading={isSendingTest}
        onConfirm={async () => {
          if (!config.emailTo) return;
          setIsSendingTest(true);
          try {
            await sendTestEmail({ emailTo: config.emailTo });
            console.log("Test email sent successfully");
          } catch (error) {
            console.error("Failed to send test email:", error);
          } finally {
            setIsSendingTest(false);
            setTestModalVisible(false);
          }
        }}
        onCancel={() => setTestModalVisible(false)}
      />

      <UKeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ActionScreenLayout
          paddingHorizontal={16}
          style={{ backgroundColor: THEME.colors.background }}
        >
          {/* FROM FIELD */}
          <UView className="flex-row items-center py-4 border-b" style={{ borderColor: THEME.colors.surfaceElevated }}>
            <BodyText className="w-20" style={{ color: THEME.colors.textMuted }}>From</BodyText>
            <BodyText className="flex-1" style={{ color: THEME.colors.textMuted }}>forfeit@commit.com</BodyText>
          </UView>

          {/* TO FIELD - Direct Bind */}
          <UView className="flex-row items-center py-4 border-b" style={{ borderColor: THEME.colors.surfaceElevated }}>
            <BodyText className="w-20" style={{ color: THEME.colors.textMuted }}>To</BodyText>
            <UTextInput
              value={config.emailTo || ""}
              onChangeText={(text) => syncToDraft({ emailTo: text })}
              placeholder="friend@example.com"
              placeholderTextColor={THEME.colors.textMuted}
              className="flex-1 text-base py-0"
              style={{ color: THEME.colors.textMain }}
              autoCapitalize="none"
              multiline={false}
            />
            <MaterialCommunityIcons name="chevron-down" size={20} color={THEME.colors.textMuted} />
          </UView>

          {/* SUBJECT FIELD - Direct Bind */}
          <UView className="flex-row items-center py-4 border-b" style={{ borderColor: THEME.colors.surfaceElevated }}>
            <BodyText className="w-20" style={{ color: THEME.colors.textMuted }}>Subject</BodyText>
            <UTextInput
              value={config.emailSubject || "I failed my commitment!"}
              onChangeText={(text) => syncToDraft({ emailSubject: text })}
              placeholder="Add a subject"
              placeholderTextColor={THEME.colors.textMuted}
              className="flex-1 text-base py-0 font-medium"
              style={{ color: THEME.colors.textMain }}
            />
          </UView>

          {/* MESSAGE AREA - Direct Bind to description */}
          <UView className="flex-row items-start py-4 border-b min-h-[120px]" style={{ borderColor: THEME.colors.surfaceElevated }}>
            <BodyText className="w-20 mt-1" style={{ color: THEME.colors.textMuted }}>Message</BodyText>
            <UTextInput
              value={config.description || ""}
              onChangeText={(text) => syncToDraft({ description: text, emailBody: text })}
              placeholder="Start typing..."
              placeholderTextColor={THEME.colors.textMuted}
              multiline
              textAlignVertical="top"
              className="flex-1 text-base py-0 leading-6"
              style={{ color: THEME.colors.textMain }}
            />
          </UView>

          <UView className="py-6">
            {/* INLINE IMAGE PREVIEW (X/Post Style) */}
            {freshUrl && (
              <UView 
                className="relative w-full aspect-square overflow-hidden border"
                style={{ 
                  backgroundColor: THEME.colors.surface, 
                  borderRadius: THEME.radii.lg,
                  borderColor: THEME.colors.surfaceElevated 
                }}
              >
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
          <UView className="w-full h-[1px] my-8" style={{ backgroundColor: THEME.colors.border }} />

          {/* TEST RECEIVER SANDBOX CARD */}
          <UView 
            className="border py-5 mb-12"
            style={{ 
              backgroundColor: THEME.colors.surface, 
              borderColor: THEME.colors.border,
              borderRadius: THEME.radii.card 
            }}
          >
            <UView className="mb-4 px-4">
              <HeaderTitle className="text-xl" style={{ color: THEME.colors.textMain }}>Test the receiver</HeaderTitle>
              <BodyText className="text-sm mt-1" style={{ color: THEME.colors.textMuted }}>
                Preview how the email will look in their inbox.
              </BodyText>
            </UView>

            {/* FROM FIELD (TEST) */}
            <UView className="flex-row items-center px-4 py-4 border-b" style={{ borderColor: THEME.colors.surfaceElevated }}>
              <BodyText className="w-20" style={{ color: THEME.colors.textMuted }}>From</BodyText>
              <BodyText className="flex-1" style={{ color: THEME.colors.textMuted }}>forfeit@commit.com</BodyText>
            </UView>

            {/* TO FIELD (TEST) */}
            <UView className="flex-row items-center px-4 py-4 border-b" style={{ borderColor: THEME.colors.surfaceElevated }}>
              <BodyText className="w-20" style={{ color: THEME.colors.textMuted }}>To</BodyText>
              <UTextInput
                value={config.emailTo || "friend@example.com"}
                editable={false}
                placeholderTextColor={THEME.colors.textMuted}
                className="flex-1 text-base py-0"
                style={{ color: THEME.colors.textMuted }}
              />
            </UView>

            {/* SUBJECT FIELD (TEST) */}
            <UView className="flex-row items-center px-4 py-4 border-b" style={{ borderColor: THEME.colors.surfaceElevated }}>
              <BodyText className="w-20" style={{ color: THEME.colors.textMuted }}>Subject</BodyText>
              <UTextInput
                value="beta test"
                editable={false}
                placeholderTextColor={THEME.colors.textMuted}
                className="flex-1 text-base py-0 font-medium"
                style={{ color: THEME.colors.textMuted }}
              />
            </UView>

            {/* MESSAGE AREA (TEST) */}
            <UView className="flex-row items-start px-4 pt-4">
              <BodyText className="w-20 mt-1" style={{ color: THEME.colors.textMuted }}>Message</BodyText>
              <UTextInput
                value="test message"
                editable={false}
                multiline
                textAlignVertical="top"
                className="flex-1 text-base py-0 leading-6"
                style={{ color: THEME.colors.textMuted }}
              />
            </UView>
            
            <UView className="px-4">
              <PrimaryButton 
                className="mt-8 mb-2 h-14" 
                onPress={() => setTestModalVisible(true)}
              >
                Test Now
              </PrimaryButton>
            </UView>
          </UView>

        </ActionScreenLayout>
      </UKeyboardAvoidingView>
    </UView>
  );
}
