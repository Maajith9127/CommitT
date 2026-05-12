import React, { type ReactNode, useState } from "react";
import { Pressable, Text } from "react-native";
import Svg, { Path } from "react-native-svg";
import { withUniwind } from "uniwind";
import { THEME } from "@/constants/theme";

const UPressable = withUniwind(Pressable);
const UText = withUniwind(Text);

type BtnProps = {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  textClassName?: string;
  disabled?: boolean;
};

// ---------------------------
// PRIMARY BUTTON
// ---------------------------
export function PrimaryButton({ children, className = "", onPress, textClassName = "", disabled = false }: BtnProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <UPressable
      className={`w-full items-center justify-center py-4 ${className}`}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={{ 
        backgroundColor: isPressed && !disabled ? THEME.colors.primaryLight : THEME.colors.primary, 
        borderRadius: THEME.radii.inner,
        opacity: disabled ? 0.5 : 1
      }}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <UText className={`${textClassName}`} style={{ fontSize: THEME.typography.size.lg, fontWeight: THEME.typography.weight.semibold, color: THEME.colors.textMain }}>{children}</UText>
    </UPressable>
  );
}

// ---------------------------
// SECONDARY BUTTON
// ---------------------------
export function SecondaryButton({ children, className = "", onPress }: BtnProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <UPressable
      className={`items-center justify-center py-3 ${className}`}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={{ 
        backgroundColor: isPressed ? THEME.colors.surfaceLight : THEME.colors.surfaceElevated, 
        borderRadius: THEME.radii.md, 
        paddingHorizontal: THEME.spacing.lg 
      }}
      onPress={onPress}
    >
      <UText style={{ fontSize: THEME.typography.size.base, fontWeight: THEME.typography.weight.medium, color: THEME.colors.textMain }}>{children}</UText>
    </UPressable>
  );
}

// ---------------------------
// LINK BUTTON
// ---------------------------
export function LinkButton({ children, className = "", onPress }: BtnProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <UPressable 
      className={`items-center justify-center ${className}`} 
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={{ 
        paddingVertical: THEME.spacing.sm,
        opacity: isPressed ? 0.7 : 1
      }} 
      onPress={onPress}
    >
      <UText style={{ color: THEME.colors.primary, fontSize: THEME.typography.size.base, textDecorationLine: "underline" }}>{children}</UText>
    </UPressable>
  );
}

// ---------------------------
// ADD BUTTON ( + Add )
export function AddButton({
  className = "",
  onPress,
  disabled = false,
}: {
  className?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <UPressable
      className={`h-fit flex-row items-center ${className}`}
      style={{ backgroundColor: THEME.colors.surface, borderRadius: THEME.radii.full, paddingHorizontal: 10, paddingVertical: THEME.spacing.xs }}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      {/* SVG ICON */}
      <Svg width={16} height={16} viewBox="0 0 24 24" className="-mr-0.5">
        <Path
          d="M12 4V20"
          stroke={THEME.colors.primary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M4 12H20"
          stroke={THEME.colors.primary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>

      {/* TEXT */}
      <UText className="ml-[2px]" style={{ color: THEME.colors.primary, fontSize: THEME.typography.size.base, fontWeight: THEME.typography.weight.semibold }}>Add</UText>
    </UPressable>
  );
}
