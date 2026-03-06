/**
 * @file EmbarrassingPhotoScreen.tsx
 * @description Penalty configuration screen for the "Embarrassing Photo" forfeit.
 */

import { useState } from "react";
import { View, ScrollView, Image, Pressable, TextInput, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { HeaderTitle, FooterText } from "@/components/ui/text";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { PrimaryButton } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import { usePenaltySync } from "@/hooks/commits/usePenaltySync";

const UView = withUniwind(View);
const UScrollView = withUniwind(ScrollView);
const UImage = withUniwind(Image);
const UPressable = withUniwind(Pressable);
const UTextInput = withUniwind(TextInput);

export default function EmbarrassingPhotoScreen() {
  const router = useRouter();
  
  //  DIRECT SYNC: Reading directly from Zustand
  const { draft, syncToDraft } = usePenaltySync();
  const config = draft.penalty?.config || {};

  // Local UI State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          "Permission Denied",
          "We need access to your gallery to upload an embarrassing photo!"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        syncToDraft({ photoUrl: result.assets[0].uri });
        console.log("[Photo] Image selected successfully:", result.assets[0].uri);
      }
    } catch (error) {
      console.error("[Photo] Error picking image:", error);
      Alert.alert("Error", "Something went wrong while picking the photo.");
    }
  };

  const handleLockConsequence = () => {
    // Validation
    if (!config.photoUrl) {
      setModalTitle("Please select a photo. A forfeit requires proof!");
      setModalVisible(true);
      return;
    }
    
    if (!config.description || config.description.trim().length === 0) {
      setModalTitle("Please provide a description for the self-deprecation penalty.");
      setModalVisible(true);
      return;
    }
    
    if (config.channel === "email" && (!config.emailTo || !config.emailSubject || !config.emailBody)) {
      setModalTitle("Please complete the 'Email Blast' setup before locking.");
      setModalVisible(true);
      return;
    }

    router.push("/(create-commit)/final");
  };

  return (
    <UView className="flex-1 bg-black">
      <UScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenContainer>
          {/* TOP TITLE */}
          <UView className="mt-12">
            <HeaderTitle className="text-3xl">Digital Forfeit</HeaderTitle>
            <FooterText className="mt-2 text-sm text-gray-400">
              Upload a cringe photo that will be sent if you fail.
            </FooterText>
          </UView>

          <ConfirmationModal
            visible={modalVisible}
            title={modalTitle}
            confirmText="Got it"
            singleButton={true}
            onConfirm={() => setModalVisible(false)}
            onCancel={() => setModalVisible(false)}
          />

          {/* PHOTO UPLOAD AREA */}
          <UView className="mt-8">
            <UView className="flex-row items-center mb-4 gap-2">
              <HeaderTitle className="text-2xl">The Evidence</HeaderTitle>
              <MaterialCommunityIcons name="chevron-down-circle" size={24} color="#4FA0FF" />
            </UView>

            <UPressable 
              onPress={handlePickImage}
              className="w-full aspect-square rounded-3xl bg-[#1A1A1A] items-center justify-center border-2 border-dashed border-[#333] overflow-hidden"
            >
              {config.photoUrl ? (
                <UImage source={{ uri: config.photoUrl }} className="w-full h-full" />
              ) : (
                <UView className="items-center">
                  <MaterialCommunityIcons name="camera-plus-outline" size={48} color="#4FA0FF" />
                  <FooterText className="mt-2 text-gray-500 font-bold uppercase">Upload Photo</FooterText>
                </UView>
              )}
            </UPressable>
          </UView>

          {/* DESCRIPTION AREA */}
          <UView className="mt-8">
            <UView className="flex-row items-center mb-4 gap-2">
              <HeaderTitle className="text-2xl">Self Deprecation</HeaderTitle>
              <MaterialCommunityIcons name="chevron-down-circle" size={24} color="#4FA0FF" />
            </UView>
            
            <UView className="w-full rounded-2xl bg-[#1A1A1A] p-4 min-h-[120px] border border-[#333]">
              <UTextInput
                placeholder="Describe why this photo is so bad..."
                placeholderTextColor="#666"
                multiline
                value={config.description || ""}
                onChangeText={(text: string) => syncToDraft({ description: text, emailBody: text })}
                className="text-white text-base font-medium flex-1"
                textAlignVertical="top"
              />
            </UView>
          </UView>

          {/* SEND VIA ROW */}
          <UView className="flex-row items-center mt-8 gap-2">
            <HeaderTitle className="text-2xl">Send via</HeaderTitle>
            <MaterialCommunityIcons name="chevron-down-circle" size={24} color="#4FA0FF" />
          </UView>

          <UView className="mt-4">
            <ConditionCard
              icon="whatsapp"
              iconColor="#25D366"
              title="WhatsApp"
              subtitle="Send automatically to chosen contacts"
              selected={config.channel === "whatsapp" || !config.channel}
              onPress={() => syncToDraft({ channel: "whatsapp" })}
              showArrow={true}
            />
            <ConditionCard
              icon="instagram"
              iconColor="#E4405F"
              title="Instagram DM"
              subtitle="Directly to your followers"
              selected={config.channel === "instagram"}
              onPress={() => syncToDraft({ channel: "instagram" })}
              showArrow={true}
            />
            <ConditionCard
              icon="email-outline"
              iconColor="#4FA0FF"
              title="Email Blast"
              subtitle="To your custom contact list"
              selected={config.channel === "email"}
              onPress={() => {
                syncToDraft({ channel: "email" });
                router.push({
                  pathname: "/(penalties)/email-setup",
                  params: { 
                    photoUri: config.photoUrl || "",
                    description: config.description || ""
                  }
                });
              }}
              showArrow={true}
            />
            <ConditionCard
              icon="shield-account-outline"
              iconColor="#A855F7"
              title="Commit Direct"
              subtitle="Send to a specific Commit user"
              selected={config.channel === "commit"}
              onPress={() => syncToDraft({ channel: "commit" })}
              showArrow={true}
            />
          </UView>

        </ScreenContainer>
      </UScrollView>

      {/* STICKY BOTTOM BUTTON */}
      <UView className="absolute bottom-0 left-0 right-0 bg-black px-4 py-4 pb-8 border-t border-[#111]">
        <PrimaryButton onPress={handleLockConsequence}>Lock Consequence</PrimaryButton>
      </UView>

    </UView>
  );
}
