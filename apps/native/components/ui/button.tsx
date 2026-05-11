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
      className={`w-full items-center justify-center rounded-full ${className}`}
      style={{ backgroundColor: THEME.colors.primary }}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <UText className={`font-semibold text-lg text-white ${textClassName}`}>{children}</UText>
    </UHeroButton>
  );
}

// ---------------------------
// SECONDARY BUTTON
// ---------------------------
export function SecondaryButton({ children, className = "", onPress }: BtnProps) {
  return (
    <UHeroButton
      className={`items-center rounded-xl px-4 py-3 ${className}`}
      style={{ backgroundColor: THEME.colors.surfaceElevated }}
      onPress={onPress}
    >
      <UText className="font-medium text-base text-white">{children}</UText>
    </UHeroButton>
  );
}

// ---------------------------
// LINK BUTTON
// ---------------------------
export function LinkButton({ children, className = "", onPress }: BtnProps) {
  return (
    <UHeroButton className={`py-2 ${className}`} onPress={onPress}>
      <UText className="text-base underline" style={{ color: THEME.colors.primary }}>{children}</UText>
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
      className={`h-fit flex-row items-center rounded-full px-2.5 py-1 ${className}`}
      style={{ backgroundColor: THEME.colors.surface }}
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
      <UText className="ml-[2px] font-semibold text-base" style={{ color: THEME.colors.primary }}>Add</UText>
    </UPressable>
  );
}
