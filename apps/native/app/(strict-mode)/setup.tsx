import React, { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";

import { 
  ActionScreenLayout, 
  HeaderTitle, 
  AuthTitle, 
  PrimaryButton, 
  FooterText 
} from "@/components/ui";

const UView = withUniwind(View);

/**
 * StrictModeSetupScreen
 * 
 * Arranged following the unified 'ActionScreen' pattern.
 * Provides a high-stakes confirmation flow for locking tasks in the Steel Vault.
 */
export default function StrictModeSetupScreen() {
  const router = useRouter();
  const { taskId, title } = useLocalSearchParams<{ taskId: string; title: string }>();
  const [isActivating, setIsActivating] = useState(false);

  const handleActivate = async () => {
    setIsActivating(true);
    console.log("[STRICT_MODE] Activation triggered for:", taskId);
    // Logic for backend activation would go here
    setTimeout(() => {
      setIsActivating(false);
      router.back();
    }, 800);
  };

  return (
    <ActionScreenLayout
      paddingHorizontal={16}
      className="bg-black pt-20"
      footer={
        <UView>
          <PrimaryButton 
            onPress={handleActivate}
            disabled={isActivating}
          >
            {isActivating ? "Locking..." : "Activate Strict Mode"}
          </PrimaryButton>
        </UView>
      }
    >
      {/* 1. HEADER SECTION (Arrangement matching penaltywaiver) */}
      <View className="mb-8">
        <HeaderTitle className="text-3xl text-[#4FA0FF]">Strict Mode</HeaderTitle>
        <AuthTitle className="mt-1 mb-0 text-left text-gray-400">
          Locking <AuthTitle className="text-white font-bold">"{title || 'this task'}"</AuthTitle> makes it immutable across all future instances.
        </AuthTitle>
      </View>
    </ActionScreenLayout>
  );
}
