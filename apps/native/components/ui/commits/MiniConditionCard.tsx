import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { withUniwind } from "uniwind";
import { FooterText } from "@/components/ui/text";

const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);

export type MiniConditionCardProps = {
  icon: string;
  title: string;
  onPress?: () => void;
  className?: string;
  width?: number;
  iconColor?: string;
  selected?: boolean;
  selectionColor?: string;
};

export function MiniConditionCard({
  icon,
  title,
  onPress,
  className = "",
  width,
  iconColor = "#4FA0FF",
  selected = false,
  selectionColor = "#4FA0FF",
}: MiniConditionCardProps) {
  return (
    <UButton
      onPress={onPress}
      style={[
        width ? { width } : undefined,
        selected ? { borderWidth: 3, borderColor: selectionColor } : undefined,
      ]}
      className={`items-center justify-center rounded-[20px] bg-[#1A1A1A] py-3 ${className}`}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons name={icon} size={35} color={iconColor} style={{ marginBottom: 4 }} />
      <FooterText className="font-semibold text-white text-xs">{title}</FooterText>
    </UButton>
  );
}
