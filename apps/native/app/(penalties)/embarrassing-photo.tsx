import { useState } from "react";
import { View, ScrollView, Image, Pressable, TextInput } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";

import { HeaderTitle, FooterText } from "@/components/ui/text";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ConditionCard } from "@/components/ui/commits/ConditionCard";
import { PrimaryButton } from "@/components/ui/button";

const UView = withUniwind(View);
const UScrollView = withUniwind(ScrollView);
const UImage = withUniwind(Image);
const UPressable = withUniwind(Pressable);
const UTextInput = withUniwind(TextInput);

export default function EmbarrassingPhotoScreen() {
  const router = useRouter();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string>("whatsapp");
  const [selectedRecipient, setSelectedRecipient] = useState<string>("partner");

  const handlePickImage = () => {
    // Placeholder for image picking logic
    // In a real app, this would use expo-image-picker
    console.log("Picking image...");
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
              {photoUri ? (
                <UImage source={{ uri: photoUri }} className="w-full h-full" />
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
                value={description}
                onChangeText={setDescription}
                className="text-white text-base font-medium flex-1 text-top"
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
              selected={selectedChannel === "whatsapp"}
              onPress={() => setSelectedChannel("whatsapp")}
            />
            <ConditionCard
              icon="instagram"
              iconColor="#E4405F"
              title="Instagram DM"
              subtitle="Directly to your followers"
              selected={selectedChannel === "instagram"}
              onPress={() => setSelectedChannel("instagram")}
            />
            <ConditionCard
              icon="email-outline"
              iconColor="#4FA0FF"
              title="Email Blast"
              subtitle="To your custom contact list"
              selected={selectedChannel === "email"}
              onPress={() => setSelectedChannel("email")}
            />
          </UView>

          {/* RECIPIENT ROW */}
          <UView className="flex-row items-center mt-8 gap-2">
            <HeaderTitle className="text-2xl">Recipient</HeaderTitle>
            <MaterialCommunityIcons name="chevron-down-circle" size={24} color="#4FA0FF" />
          </UView>

          <UView className="mt-4">
            <ConditionCard
              icon="account-group"
              iconColor="#4FA0FF"
              title="Accountability Partner"
              subtitle="Best friend or mentor"
              selected={selectedRecipient === "partner"}
              onPress={() => setSelectedRecipient("partner")}
            />
            <ConditionCard
              icon="account-heart"
              iconColor="#FF3B30"
              title="Your Crush / Partner"
              subtitle="Maximum embarrassment level"
              selected={selectedRecipient === "crush"}
              onPress={() => setSelectedRecipient("crush")}
            />
          </UView>
        </ScreenContainer>
      </UScrollView>

      {/* STICKY BOTTOM BUTTON */}
      <UView className="absolute bottom-0 left-0 right-0 bg-black px-4 py-4 pb-8">
        <PrimaryButton onPress={() => router.back()}>Lock Consequence</PrimaryButton>
      </UView>
    </UView>
  );
}
