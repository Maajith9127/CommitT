import { Text } from "react-native";
import { withUniwind } from "uniwind";
import { Button as HeroButton } from "heroui-native";
import type { ReactNode } from "react";
import Svg, { Path } from "react-native-svg";

const UHeroButton = withUniwind(HeroButton);
const UText = withUniwind(Text);

type BtnProps = {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
};

// ---------------------------
// PRIMARY BUTTON
// ---------------------------
export function PrimaryButton({ children, className = "", onPress }: BtnProps) {
  return (
    <UHeroButton
      className={`
        w-full
        rounded-full
        bg-[#4FA0FF]
        items-center
        justify-center
        ${className}
      `}
      onPress={onPress}
    >
      <UText className="text-white text-lg font-semibold">{children}</UText>
    </UHeroButton>
  );
}

// ---------------------------
// SECONDARY BUTTON
// ---------------------------
export function SecondaryButton({
  children,
  className = "",
  onPress,
}: BtnProps) {
  return (
    <UHeroButton
      className={`bg-gray-700 py-3 px-4 rounded-xl items-center ${className}`}
      onPress={onPress}
    >
      <UText className="text-white font-medium text-base">{children}</UText>
    </UHeroButton>
  );
}

// ---------------------------
// LINK BUTTON
// ---------------------------
export function LinkButton({ children, className = "", onPress }: BtnProps) {
  return (
    <UHeroButton className={`py-2 ${className}`} onPress={onPress}>
      <UText className="text-blue-400 text-base underline">{children}</UText>
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
    <UHeroButton
      className={`flex-row items-center h-fit px-2.5 py-1 rounded-full bg-[#1A1A1A] ${className}`}
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
      <UText className="text-blue-400 text-base font-semibold ml-[2px]">
        Add
      </UText>
    </UHeroButton>
  );
}
