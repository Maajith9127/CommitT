import { Button as HeroButton } from "heroui-native";
import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";
import Svg, { Path } from "react-native-svg";
import { withUniwind } from "uniwind";

const UHeroButton = withUniwind(HeroButton);
const UPressable = withUniwind(Pressable);
const UText = withUniwind(Text);

type BtnProps = {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  textClassName?: string;
};

// ---------------------------
// PRIMARY BUTTON
// ---------------------------
export function PrimaryButton({ children, className = "", onPress, textClassName = "" }: BtnProps) {
  return (
    <UHeroButton
      className={`w-full items-center justify-center rounded-full bg-[#4FA0FF] ${className}
      `}
      onPress={onPress}
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
      className={`items-center rounded-xl bg-gray-800 px-4 py-3 ${className}`}
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
      <UText className="text-base text-blue-400 underline">{children}</UText>
    </UHeroButton>
  );
}

// ---------------------------
// ADD BUTTON ( + Add )
export function AddButton({
  className = "",
  onPress,
}: {
  className?: string;
  onPress?: () => void;
}) {
  return (
    <UPressable
      className={`h-fit flex-row items-center rounded-full bg-[#1A1A1A] px-2.5 py-1 ${className}`}
      onPress={onPress}
    >
      {/* SVG ICON */}
      <Svg width={16} height={16} viewBox="0 0 24 24" className="-mr-0.5">
        <Path
          d="M12 4V20"
          stroke="#4FA0FF"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M4 12H20"
          stroke="#4FA0FF"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>

      {/* TEXT */}
      <UText className="ml-[2px] font-semibold text-base text-blue-400">Add</UText>
    </UPressable>
  );
}
