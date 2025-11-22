import { Ionicons } from "@expo/vector-icons";
import { TextInput, TouchableOpacity, View } from "react-native";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const SearchBar = ({
  value,
  onChangeText,
  placeholder = "Search events...",
}: SearchBarProps) => (
  <View className="flex-row items-center rounded-lg border border-border bg-background px-3 py-2">
    <Ionicons color="#6b7280" name="search" size={20} />
    <TextInput
      accessibilityLabel="Search events"
      className="ml-2 flex-1 text-foreground"
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#6b7280"
      value={value}
    />
    {value.length > 0 && (
      <TouchableOpacity onPress={() => onChangeText("")}>
        <Ionicons color="#6b7280" name="close-circle" size={20} />
      </TouchableOpacity>
    )}
  </View>
);
