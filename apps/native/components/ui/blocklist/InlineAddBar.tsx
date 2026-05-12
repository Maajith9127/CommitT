import { View, Pressable, TextInput } from "react-native";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { THEME } from "@/constants/theme";

const UView = withUniwind(View);
const UPress = withUniwind(Pressable);
const UInput = withUniwind(TextInput);

type InlineAddBarProps = {
  placeholder: string;
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
};

export function InlineAddBar({ placeholder, value, onChange, onSubmit }: InlineAddBarProps) {
  return (
    <UView className="flex-row items-center border-b py-3 -mx-4 px-4" style={{ borderColor: THEME.colors.surfaceElevated }}>
      <UInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={THEME.colors.textMuted}
        className="flex-1 text-base p-0 text-white"
        style={{ color: THEME.colors.textMain }}
      />
      <UPress onPress={onSubmit}>
        <MaterialCommunityIcons name="arrow-up" size={22} color={THEME.colors.primary} />
      </UPress>
    </UView>
  );
}
