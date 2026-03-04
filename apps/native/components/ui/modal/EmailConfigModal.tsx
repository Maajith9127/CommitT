import React, { useState } from "react";
import { Modal, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { HeaderTitle } from "@/components/ui/text";

const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);
const UTextInput = withUniwind(TextInput);
const UKeyboardAvoidingView = withUniwind(KeyboardAvoidingView);

export interface EmailConfig {
  recipients: string;
  subject: string;
  body: string;
}

interface EmailConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (config: EmailConfig) => void;
  initialConfig?: EmailConfig;
  photoUri?: string | null;
}

export function EmailConfigModal({
  visible,
  onClose,
  onSave,
  initialConfig,
  photoUri,
}: EmailConfigModalProps) {
  const [recipients, setRecipients] = useState(initialConfig?.recipients || "");
  const [subject, setSubject] = useState(initialConfig?.subject || "I failed my commitment!");
  const [body, setBody] = useState(
    initialConfig?.body || "I am sending this because I failed to complete my habit. Please look at the attached photo for the proof of my failure."
  );

  const handleSave = () => {
    onSave({ recipients, subject, body });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <UKeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/60"
      >
        <UPressable className="flex-1" onPress={onClose} />
        
        <UView className="bg-[#1C1C1E] rounded-t-[32px] overflow-hidden border-t border-[#333]">
          {/* Gmail-Style Header (Dark Mode) - Increased Size */}
          <UView className="flex-row items-center justify-between bg-[#2C2C2E] px-5 py-4.5">
            <Text className="text-gray-100 font-semibold text-base">New Message</Text>
            <UView className="flex-row items-center gap-5">
              <MaterialCommunityIcons name="minus" size={20} color="#8E8E93" />
              <MaterialCommunityIcons name="arrow-expand" size={18} color="#8E8E93" />
              <UPressable onPress={onClose}>
                <MaterialCommunityIcons name="close" size={20} color="#8E8E93" />
              </UPressable>
            </UView>
          </UView>

          <ScrollView className="max-h-[500px]" showsVerticalScrollIndicator={false}>
            {/* Inline Recipients (Dark Mode) */}
            <UView className="flex-row items-center px-4 py-4 border-b border-[#2C2C2E]">
              <Text className="text-gray-500 text-base w-24">Recipients</Text>
              <UTextInput
                value={recipients}
                onChangeText={setRecipients}
                placeholderTextColor="#444"
                className="flex-1 text-white text-base py-0"
                autoCapitalize="none"
              />
            </UView>

            {/* Inline Subject (Dark Mode) */}
            <UView className="flex-row items-center px-4 py-4 border-b border-[#2C2C2E]">
              <Text className="text-gray-500 text-base w-24">Subject</Text>
              <UTextInput
                value={subject}
                onChangeText={setSubject}
                placeholderTextColor="#444"
                className="flex-1 text-white text-base py-0 font-medium"
              />
            </UView>

            {/* Body Area (Dark Mode) */}
            <UView className="px-4 py-6 min-h-[300px] flex-1 justify-between">
              <UTextInput
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
                className="text-white text-base leading-6"
                placeholder="Type your message..."
                placeholderTextColor="#444"
              />

              {/* ATTACHMENT PILL (Gmail style - Dark Theme) */}
              {photoUri && (
                <UView className="mt-8 flex-row items-center bg-[#2C2C2E] rounded-lg px-4 py-3 border border-[#333]">
                  <MaterialCommunityIcons name="image-outline" size={20} color="#4FA0FF" className="mr-3" />
                  <UView className="flex-1">
                    <Text className="text-[#4FA0FF] text-sm font-semibold" numberOfLines={1}>
                      forfeit_evidence_{new Date().getTime().toString().slice(-4)}.jpg
                    </Text>
                  </UView>
                  <Text className="text-[#8E8E93] text-xs mx-4">(1.2 MB)</Text>
                  <UPressable hitSlop={10}>
                    <MaterialCommunityIcons name="close" size={18} color="#8E8E93" />
                  </UPressable>
                </UView>
              )}
            </UView>

            {/* ACTION BAR (Dark Mode Style) */}
            <UView className="px-4 py-4 bg-[#1C1C1E] border-t border-[#2C2C2E] flex-row items-center justify-between pb-10">
              <UView className="flex-row items-center">
                {/* Segmented Send Button (Modified for Dark Theme) */}
                <UView className="flex-row items-center bg-[#4FA0FF] rounded-full overflow-hidden mr-4">
                  <UPressable 
                    onPress={handleSave}
                    className="px-5 py-2 border-r border-[#00000022]"
                  >
                    <Text className="text-black font-bold text-sm">Send</Text>
                  </UPressable>
                  <UPressable className="px-2 py-2">
                    <MaterialCommunityIcons name="menu-down" size={20} color="black" />
                  </UPressable>
                </UView>

                {/* Utility Icons (Subtle Gray) */}
                <UView className="flex-row items-center gap-4">
                  <MaterialCommunityIcons name="text-format" size={20} color="#8E8E93" />
                  <MaterialCommunityIcons name="attachment" size={20} color="#8E8E93" />
                  <MaterialCommunityIcons name="link-variant" size={20} color="#8E8E93" />
                  <MaterialCommunityIcons name="emoticon-outline" size={20} color="#8E8E93" />
                  <MaterialCommunityIcons name="google-drive" size={20} color="#8E8E93" />
                  <MaterialCommunityIcons name="image-outline" size={20} color="#8E8E93" />
                  <MaterialCommunityIcons name="lock-clock" size={20} color="#8E8E93" />
                  <MaterialCommunityIcons name="pencil-outline" size={20} color="#8E8E93" />
                </UView>
              </UView>

              <UPressable onPress={onClose}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#8E8E93" hitSlop={10} />
              </UPressable>
            </UView>
          </ScrollView>
        </UView>
      </UKeyboardAvoidingView>
    </Modal>
  );
}
