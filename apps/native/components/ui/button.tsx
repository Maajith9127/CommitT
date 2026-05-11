import { Button as HeroButton } from "heroui-native";
import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";
import Svg, { Path } from "react-native-svg";
import { withUniwind } from "uniwind";
import { THEME } from "@/constants/theme";

const UHeroButton = withUniwind(HeroButton);
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
  return (
    <UHeroButton
      className={`w-full items-center justify-center ${className}`}
      style={{ backgroundColor: THEME.colors.primary, borderRadius: THEME.radii.full }}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <UText className={`${textClassName}`} style={{ fontSize: THEME.typography.size.lg, fontWeight: THEME.typography.weight.semibold, color: THEME.colors.textMain }}>{children}</UText>
    </UHeroButton>
  );
}

// ---------------------------
// SECONDARY BUTTON
// ---------------------------
export function SecondaryButton({ children, className = "", onPress }: BtnProps) {
  return (
    <UHeroButton
      className={`items-center ${className}`}
      style={{ backgroundColor: THEME.colors.surfaceElevated, borderRadius: THEME.radii.md, paddingHorizontal: THEME.spacing.lg, paddingVertical: THEME.spacing.md }}
      onPress={onPress}
    >
      <UText style={{ fontSize: THEME.typography.size.base, fontWeight: THEME.typography.weight.medium, color: THEME.colors.textMain }}>{children}</UText>
    </UHeroButton>
  );
}

// ---------------------------
// LINK BUTTON
// ---------------------------
export function LinkButton({ children, className = "", onPress }: BtnProps) {
  return (
    <UHeroButton className={`${className}`} style={{ paddingVertical: THEME.spacing.sm }} onPress={onPress}>
      <UText style={{ color: THEME.colors.primary, fontSize: THEME.typography.size.base, textDecorationLine: "underline" }}>{children}</UText>
    </UHeroButton>
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
