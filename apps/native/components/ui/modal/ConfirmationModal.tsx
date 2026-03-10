import React from "react";
import { Modal, Pressable, View, Text, ActivityIndicator } from "react-native";
import { withUniwind } from "uniwind";
import { FooterText, HeaderTitle } from "@/components/ui/text";

const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);
const UText = withUniwind(Text);

export type ConfirmationModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string; // Color prop for confirm button
  cancelColor?: string;  // Color prop for cancel button
  singleButton?: boolean; // If true, only shows confirm button (for acknowledgement modals)
  isLoading?: boolean;    // If true, shows a spinner in the confirm button
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
};

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "#4FA0FF",
  cancelColor = "#4FA0FF", // Default cancel to blue
  singleButton = false,
  isLoading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmationModalProps) {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/* Backdrop */}
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 30,
        }}
      >
        {/* Modal Content */}
        <UView className="w-full rounded-3xl bg-[#252525] p-5 shadow-xl">
          {/* 1. Title Area */}
          <HeaderTitle className="text-center text-lg font-bold text-white mb-2">
            {title}
          </HeaderTitle>

          {/* Message — shown below the title when provided */}
          {message && (
            <FooterText className="text-center text-sm text-gray-400 mb-4">
              {message}
            </FooterText>
          )}

          {/* Optional custom children */}
          {children && (
            <UView className="mb-4">
              {children}
            </UView>
          )}

          {/* Buttons Row - RIGHT ALIGNED (or centered if single button) */}
          <UView className={`flex-row ${singleButton ? "justify-center" : "justify-end"} space-x-6 gap-8`}>
            {/* 2. Cancel Button - only show if not single button mode */}
            {!singleButton && (
              <UPressable onPress={onCancel} hitSlop={10} disabled={isLoading}>
                  <FooterText 
                      className="text-base font-bold uppercase"
                      style={{ color: cancelColor, opacity: isLoading ? 0.5 : 1 }}
                  >
                      {cancelText}
                  </FooterText>
              </UPressable>
            )}

            {/* 3. Confirm Button */}
            <UPressable onPress={onConfirm} hitSlop={10} disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={confirmColor} />
                ) : (
                  <FooterText 
                      className="text-base font-bold uppercase"
                      style={{ color: confirmColor }}
                  >
                      {confirmText}
                  </FooterText>
                )}
            </UPressable>
          </UView>
        </UView>
      </View>
    </Modal>
  );
}
