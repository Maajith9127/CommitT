import { Modal, Pressable, View, Text } from "react-native";
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
  onConfirm: () => void;
  onCancel: () => void;
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
  onConfirm,
  onCancel,
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
          


          {/* Buttons Row - RIGHT ALIGNED (or centered if single button) */}
          <UView className={`flex-row ${singleButton ? "justify-center" : "justify-end"} space-x-6 gap-8`}>
            {/* 2. Cancel Button - only show if not single button mode */}
            {!singleButton && (
              <UPressable onPress={onCancel} hitSlop={10}>
                  <FooterText 
                      className="text-base font-bold uppercase"
                      style={{ color: cancelColor }}
                  >
                      {cancelText}
                  </FooterText>
              </UPressable>
            )}

            {/* 3. Confirm Button */}
            <UPressable onPress={onConfirm} hitSlop={10}>
                <FooterText 
                    className="text-base font-bold uppercase"
                    style={{ color: confirmColor }}
                >
                    {confirmText}
                </FooterText>
            </UPressable>
          </UView>
        </UView>
      </View>
    </Modal>
  );
}
