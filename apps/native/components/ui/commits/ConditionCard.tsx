import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TouchableOpacity, View, GestureResponderEvent } from "react-native";
import { withUniwind } from "uniwind";
import { FooterText, HeaderTitle } from "@/components/ui/text";

const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);

export type ConditionCardProps = {
  icon: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  className?: string;
  width?: number;
  iconColor?: string;
  titleColor?: string;
  selected?: boolean;
  selectionColor?: string;
  showArrow?: boolean;
  onClear?: () => void;
};

export function ConditionCard({
  icon,
  title,
  subtitle,
  onPress,
  className = "",
  width,
  iconColor = "#4FA0FF",
  titleColor = "#FFFFFF",
  selected = false,
  selectionColor = "#4FA0FF",
  showArrow = false,
  onClear,
}: ConditionCardProps) {
  return (
    <UButton
      onPress={onPress}
      style={[
        width ? { width } : undefined,
        selected ? { borderWidth: 3, borderColor: selectionColor } : undefined,
        { overflow: "visible" }
      ]}
      className={`mb-4 rounded-3xl bg-[#1A1A1A] px-4 py-4 ${className}`}
      activeOpacity={0.8}
    >
      {/* 1. CLEAR BUTTON (Optional) — Positioned at Top Right */}
      {selected && onClear && (
        <UButton
          onPress={(e: GestureResponderEvent) => {
             e.stopPropagation();
             onClear();
          }}
          className="absolute -top-2 -right-2 z-20 h-7 w-7 items-center justify-center rounded-full bg-[#2A2A2A]"
          style={{ 
            shadowColor: "#000", 
            shadowOffset: { width: 0, height: 1 }, 
            shadowOpacity: 0.3, 
            shadowRadius: 2, 
            elevation: 3 
          }}
          hitSlop={12}
        >
          <MaterialCommunityIcons name="close" size={16} color="#A0A0A0" />
        </UButton>
      )}

      <UView className="flex-row items-center">
        {/* ICON */}
        <MaterialCommunityIcons
          name={icon}
          size={30}
          color={iconColor}
          style={{ marginRight: 12 }}
        />

        {/* TITLE + SUBTITLE */}
        <UView className="flex-1">
          <HeaderTitle className="text-lg" style={{ color: titleColor }}>
            {title}
          </HeaderTitle>

          <FooterText className="mt-1 text-gray-400 text-sm">{subtitle}</FooterText>
        </UView>

        {/* RIGHT ARROW */}
        {showArrow && (
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color="#8E8E93"
          />
        )}
      </UView>
    </UButton>
  );
}
