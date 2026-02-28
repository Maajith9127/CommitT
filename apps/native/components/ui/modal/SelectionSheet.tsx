import React from "react";
import { Modal, Pressable, ScrollView, View, TouchableOpacity } from "react-native";
import { withUniwind } from "uniwind";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
        
        <UView className="bg-[#1C1C1E] rounded-t-[32px] px-6 pb-12 pt-4">
          {/* Handle */}
          <UView className="w-12 h-1.5 bg-[#3A3A3C] rounded-full self-center mb-6" />
          
          <HeaderTitle className="text-2xl mb-6 text-white">{title}</HeaderTitle>
          
          <UScroll className="max-h-[400px]">
            {options.map((option, index) => (
              <UButton
                key={option.value.toString()}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                className={`flex-row items-center justify-between py-4 ${
                  index < options.length - 1 ? "border-b border-[#2C2C2E]" : ""
                }`}
              >
                <UView className="flex-1 mr-4">
                  <FooterText className={`text-lg ${selectedValue === option.value ? "text-[#4FA0FF] font-semibold" : "text-white"}`}>
                    {option.label}
                  </FooterText>
                  {option.description && (
                    <FooterText className="text-sm text-[#8E8E93] mt-1">
                      {option.description}
                    </FooterText>
                  )}
                </UView>
                
                {selectedValue === option.value && (
                  <MaterialCommunityIcons name="check" size={24} color="#4FA0FF" />
                )}
              </UButton>
            ))}
          </UScroll>
          
          <UButton 
            onPress={onClose}
            className="mt-6 bg-[#2C2C2E] py-4 rounded-2xl items-center"
          >
            <FooterText className="text-white font-semibold text-lg">Cancel</FooterText>
          </UButton>
        </UView>
      </UView>
    </Modal>
  );
}
