import React from "react";
import { Modal, Pressable, View, Text, ActivityIndicator } from "react-native";
import { withUniwind } from "uniwind";
import { FooterText, HeaderTitle } from "@/components/ui/text";
import { THEME } from "@/constants/theme";

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
  confirmColor = THEME.colors.primary,
  cancelColor = THEME.colors.primary, // Default cancel to primary
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
        <UView 
          className="w-full rounded-3xl p-5 shadow-xl"
          style={{ backgroundColor: THEME.colors.surfaceElevated }}
        >
          {/* 1. Title Area */}
          <HeaderTitle className="text-center text-xl font-bold mb-2" style={{ color: THEME.colors.textMain }}>
            {title}
          </HeaderTitle>

          {/* Message — shown below the title when provided */}
          {message && (
            <FooterText className="text-center text-base mb-4" style={{ color: THEME.colors.textMuted }}>
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
