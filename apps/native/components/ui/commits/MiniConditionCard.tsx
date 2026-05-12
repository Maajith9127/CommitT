import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { withUniwind } from "uniwind";
import { FooterText } from "@/components/ui/text";
import { THEME } from "@/constants/theme";

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
  onClear?: () => void;
};

export function MiniConditionCard({
  icon,
  title,
  onPress,
  className = "",
  width,
  iconColor = THEME.colors.primary,
  selected = false,
  selectionColor = THEME.colors.primary,
  onClear,
}: MiniConditionCardProps) {
  return (
    <UButton
      onPress={onPress}
      style={[
        { backgroundColor: THEME.colors.surface, borderRadius: 20, paddingVertical: THEME.spacing.md },
        width ? { width } : undefined,
        selected ? { borderWidth: 3, borderColor: selectionColor } : undefined,
      ]}
      className={`items-center justify-center ${className}`}
      activeOpacity={0.8}
    >
      {selected && onClear && (
        <UButton
          onPress={(e) => {
             e.stopPropagation();
             onClear();
          }}
          className="absolute -top-2 -right-2 z-20 h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: THEME.colors.surfaceElevated, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3 }}
          hitSlop={12}
        >
          <MaterialCommunityIcons name="close" size={16} color={THEME.colors.textMuted} />
        </UButton>
      )}

      <MaterialCommunityIcons name={icon as any} size={35} color={iconColor} style={{ marginBottom: 4 }} />
      <FooterText className="font-semibold">{title}</FooterText>
    </UButton>
  );
}
