import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TouchableOpacity, View, GestureResponderEvent } from "react-native";
import { withUniwind } from "uniwind";
import { FooterText, HeaderTitle } from "@/components/ui/text";
import { THEME } from "@/constants/theme";

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
  children?: React.ReactNode;
};

export function ConditionCard({
  icon,
  title,
  subtitle,
  onPress,
  className = "",
  width,
  iconColor = THEME.colors.primary,
  titleColor = THEME.colors.textMain,
  selected = false,
  selectionColor = THEME.colors.primary,
  showArrow = false,
  onClear,
  children,
}: ConditionCardProps) {
  return (
    <UButton
      onPress={onPress}
      style={[
        { backgroundColor: THEME.colors.surface, borderRadius: THEME.radii.card, padding: THEME.spacing.lg },
        width ? { width } : undefined,
        selected ? { borderWidth: 3, borderColor: selectionColor } : undefined,
        { overflow: "visible" }
      ]}
      className={`mb-4 ${className}`}
      activeOpacity={0.8}
    >
      {/* 1. CLEAR BUTTON (Optional) — Positioned at Top Right */}
      {selected && onClear && (
        <UButton
          onPress={(e: GestureResponderEvent) => {
             e.stopPropagation();
             onClear();
          }}
          className="absolute -top-2 -right-2 z-20 h-7 w-7 items-center justify-center rounded-full"
          style={{ 
            backgroundColor: THEME.colors.surfaceElevated,
            shadowColor: "#000", 
            shadowOffset: { width: 0, height: 1 }, 
            shadowOpacity: 0.3, 
            shadowRadius: 2, 
            elevation: 3 
          }}
          hitSlop={12}
        >
          <MaterialCommunityIcons name="close" size={16} color={THEME.colors.textMuted} />
        </UButton>
      )}

      <UView className="flex-row items-center">
        {/* ICON */}
        <MaterialCommunityIcons
          name={icon as any}
          size={30}
          color={iconColor}
          style={{ marginRight: 12 }}
        />

        {/* TITLE + SUBTITLE */}
        <UView className={`flex-1 ${children ? "pr-14" : ""}`}>
          <HeaderTitle style={{ color: titleColor }}>
            {title}
          </HeaderTitle>

          <FooterText style={{ marginTop: 4, color: THEME.colors.textMuted, fontSize: THEME.typography.size.sm }}>{subtitle}</FooterText>
        </UView>

        {/* RIGHT ARROW */}
        {showArrow && (
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={THEME.colors.textMuted}
          />
        )}
      </UView>

      {/* RENDER CUSTOM OVERLAYS / CHILDREN */}
      {children}
    </UButton>
  );
}
