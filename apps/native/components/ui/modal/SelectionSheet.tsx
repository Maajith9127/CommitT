import React from "react";
import { Modal, Pressable, ScrollView, View, TouchableOpacity } from "react-native";
import { withUniwind } from "uniwind";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { THEME } from "@/constants/theme";
import { PrimaryButton } from "@/components/ui/button";

const UView = withUniwind(View);
const UPress = withUniwind(Pressable);
const UScroll = withUniwind(ScrollView);
const UButton = withUniwind(TouchableOpacity);

export type SelectionOption = {
  label: string;
  value: any;
  description?: string;
};

type Props = {
  visible: boolean;
  title: string;
  options: SelectionOption[];
  selectedValue: any;
  onSelect: (value: any) => void;
  onClose: () => void;
};

export function SelectionSheet({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <UView className="flex-1 justify-end bg-black/60">
        <UPress className="flex-1" onPress={onClose} />
        
        <UView 
          className="rounded-t-[32px] pt-4"
          style={{ 
            backgroundColor: THEME.colors.surfaceElevated,
            borderTopLeftRadius: THEME.radii.inner,
            borderTopRightRadius: THEME.radii.inner,
            paddingHorizontal: THEME.spacing.xxl,
            paddingBottom: 40, // Explicit safe-area lift
          }}
        >
          {/* Handle */}
          <UView 
            className="w-12 h-1.5 rounded-full self-center mb-6" 
            style={{ backgroundColor: THEME.colors.surfaceLight }}
          />
          
          <HeaderTitle className="text-2xl mb-6">{title}</HeaderTitle>
          
          <UScroll 
            className="max-h-[400px]" 
            indicatorStyle="white"
            showsVerticalScrollIndicator={true}
          >
            {options.map((option, index) => (
              <UButton
                key={option.value.toString()}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                className={`flex-row items-center justify-between py-4 ${
                  index < options.length - 1 ? "border-b" : ""
                }`}
                style={index < options.length - 1 ? { borderBottomColor: THEME.colors.border } : {}}
              >
                <UView className="flex-1 mr-4">
                  <FooterText 
                    className="text-lg"
                    style={{ 
                      color: selectedValue === option.value ? THEME.colors.primary : THEME.colors.textMain,
                      fontWeight: selectedValue === option.value ? "600" : "400"
                    }}
                  >
                    {option.label}
                  </FooterText>
                  {option.description && (
                    <FooterText 
                      className="text-sm mt-1"
                      style={{ color: THEME.colors.textMuted }}
                    >
                      {option.description}
                    </FooterText>
                  )}
                </UView>
                
                {selectedValue === option.value && (
                  <MaterialCommunityIcons name="check" size={24} color={THEME.colors.primary} />
                )}
              </UButton>
            ))}
          </UScroll>
          
          <PrimaryButton 
            onPress={onClose}
            className="mt-6"
          >
            Cancel
          </PrimaryButton>
        </UView>
      </UView>
    </Modal>
  );
}
