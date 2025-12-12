import { TouchableOpacity, View } from "react-native";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeaderTitle, FooterText } from "@/components/ui/text";

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
  titleColor?: string;   //  NEW
};

export function ConditionCard({
  icon,
  title,
  subtitle,
  onPress,
  className = "",
  width,
  iconColor = "#4FA0FF",
  titleColor = "#FFFFFF",  //  default (white)
}: ConditionCardProps) {
  return (
    <UButton
      onPress={onPress}
      style={width ? { width } : undefined}
      className={`bg-[#1A1A1A] rounded-3xl px-4 py-4 mb-4 ${className}`}
      activeOpacity={0.8}
    >
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
          <HeaderTitle
            className="text-lg"
            style={{ color: titleColor }}    // 🔥 APPLY TITLE COLOR
          >
            {title}
          </HeaderTitle>

          <FooterText className="text-gray-400 text-sm mt-1">
            {subtitle}
          </FooterText>
        </UView>
      </UView>
    </UButton>
  );
}
