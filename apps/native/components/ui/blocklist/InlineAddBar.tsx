import { View, Pressable, TextInput } from "react-native";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
    <UView className="flex-row items-center border-b border-[#2A2A2A] py-3 -mx-4 px-4">
      <UInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#777"
        className="flex-1 text-white text-base p-0"
      />
      <UPress onPress={onSubmit}>
        <MaterialCommunityIcons name="arrow-up" size={22} color="#4FA0FF" />
      </UPress>
    </UView>
  );
}
