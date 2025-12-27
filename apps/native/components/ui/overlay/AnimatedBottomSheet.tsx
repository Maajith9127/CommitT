import { ReactNode } from "react";
import { View, TouchableOpacity, Animated } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { HeaderTitle } from "@/components/ui/text";

const UAnimatedView = withUniwind(Animated.View);
const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);

type AnimatedBottomSheetProps = {
  animValue: Animated.Value;
  height: number;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function AnimatedBottomSheet({
  animValue,
  height,
  onClose,
  title,
  children,
  className = "",
}: AnimatedBottomSheetProps) {
  return (
    <UAnimatedView
      style={{ transform: [{ translateY: animValue }], height }}
      className={`absolute bottom-0 left-0 right-0 bg-[#111111] rounded-t-3xl border-t border-[#333] px-6 py-6 shadow-xl ${className}`}
    >
      {/* INDICATOR */}
      <UView className="items-center mb-6">
        <UView className="w-12 h-1  rounded-full" />
      </UView>

      {/* CLOSE BUTTON */}
      <UButton className="absolute top-6 right-6 p-2 rounded-full bg-[#333]" onPress={onClose}>
        <MaterialCommunityIcons name="close" size={20} color="white" />
      </UButton>

      {/* TITLE (Optional) */}
      {title && <HeaderTitle className="text-2xl text-white mb-2">{title}</HeaderTitle>}

      {/* CONTENT */}
      {children}
    </UAnimatedView>
  );
}
