import { useState, useEffect } from "react";
import { View, Image, Pressable, TextInput, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";

import { ActionScreenLayout, HeaderTitle, FooterText, PrimaryButton } from "@/components/ui";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { ConfirmationModal } from "@/components/ui/modal/ConfirmationModal";
import { usePenaltySync } from "@/hooks/commits/usePenaltySync";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";
import { THEME } from "@/constants/theme";

import { useFreshPhotoUrl } from "@/hooks/useFreshPhotoUrl";

const UView = withUniwind(View);
const UImage = withUniwind(Image);
const UPressable = withUniwind(Pressable);
const UTextInput = withUniwind(TextInput);

export default function EmbarrassingPhotoScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  
  // DIRECT SYNC: Reading directly from Zustand
  const { draft, syncToDraft } = usePenaltySync();
  const setDraft = useTaskDraftStore((s) => s.setDraft); // For clearing penalty
  const config = draft.penalty?.config || {};

  // RECOVERY LOGIC: Silently refresh expired signed URLs
  const freshUrl = useFreshPhotoUrl(config.storageId, config.photoUrl);

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

    router.back();
  };

  return (
    <>
      <ActionScreenLayout
        paddingHorizontal={16}
        className="pt-20"
        style={{ backgroundColor: THEME.colors.background }}
        footer={
          <PrimaryButton onPress={handleLockConsequence}>Lock Consequence</PrimaryButton>
        }
      >
        {/* TOP TITLE */}
        <UView className="mb-8">
          <HeaderTitle className="text-3xl">Digital Forfeit</HeaderTitle>
          <FooterText className="mt-2 text-sm" style={{ color: THEME.colors.textMuted }}>
            Upload a cringe photo that will be sent if you fail.
          </FooterText>
        </UView>

        {/* PHOTO UPLOAD AREA */}
        <UView className="mt-4">
          <UView className="flex-row items-center mb-4 gap-2">
            <HeaderTitle className="text-2xl">The Evidence</HeaderTitle>
            <MaterialCommunityIcons name="chevron-down-circle" size={24} color={THEME.colors.primary} />
          </UView>

          <UPressable 
            onPress={handlePickImage}
            className="w-full aspect-square items-center justify-center border-2 border-dashed overflow-hidden"
            style={{ 
              backgroundColor: THEME.colors.surface, 
              borderRadius: THEME.radii.card,
              borderColor: THEME.colors.surfaceElevated 
            }}
          >
            {freshUrl ? (
              <Image 
                key={freshUrl}
                source={{ uri: freshUrl }} 
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <UView className="items-center">
                <MaterialCommunityIcons name="camera-plus-outline" size={48} color={THEME.colors.primary} />
                <FooterText className="mt-2 font-bold uppercase" style={{ color: THEME.colors.textMuted }}>Upload Photo</FooterText>
              </UView>
            )}
          </UPressable>
        </UView>

        {/* DESCRIPTION AREA */}
        <UView className="mt-8">
          <UView className="flex-row items-center mb-4 gap-2">
            <HeaderTitle className="text-2xl">Self Deprecation</HeaderTitle>
            <MaterialCommunityIcons name="chevron-down-circle" size={24} color={THEME.colors.primary} />
          </UView>
          
          <UView 
            className="w-full p-4 min-h-[120px] border"
            style={{ 
              backgroundColor: THEME.colors.surface, 
              borderRadius: THEME.radii.lg,
              borderColor: THEME.colors.surfaceElevated 
            }}
          >
            <UTextInput
              placeholder="Describe why this photo is so bad..."
              placeholderTextColor={THEME.colors.textMuted}
              multiline
              value={config.description || ""}
              onChangeText={(text: string) => syncToDraft({ description: text, emailBody: text })}
              className="text-base font-medium flex-1 text-top"
              style={{ color: THEME.colors.textMain }}
              textAlignVertical="top"
            />
          </UView>
        </UView>

        {/* SEND VIA ROW */}
        <UView className="flex-row items-center mt-8 gap-2">
          <HeaderTitle className="text-2xl">Send via</HeaderTitle>
          <MaterialCommunityIcons name="chevron-down-circle" size={24} color={THEME.colors.primary} />
        </UView>

        <UView className="mt-4 mb-4">
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
      </ActionScreenLayout>

      {/* GLOBAL ERROR MODAL */}
      <ConfirmationModal
        visible={modalVisible}
        title={modalTitle}
        confirmText="Got it"
        singleButton={true}
        onConfirm={() => setModalVisible(false)}
        onCancel={() => setModalVisible(false)}
      />

    </>
  );
}
