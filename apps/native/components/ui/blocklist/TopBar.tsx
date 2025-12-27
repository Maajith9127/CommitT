import { View, Pressable, TextInput } from "react-native";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const UView = withUniwind(View);
const UPress = withUniwind(Pressable);
const UInput = withUniwind(TextInput);

type TopBarProps = {
  onBack: () => void;
  enableSearch?: boolean;
  searchOpen?: boolean;
  searchText?: string;
  onSearchToggle?: () => void;
  onSearchChange?: (text: string) => void;
};

export function TopBar({
  onBack,
  enableSearch = false,
  searchOpen = false,
  searchText = "",
  onSearchToggle,
  onSearchChange,
}: TopBarProps) {
  return (
    <UView className="flex-row items-center mb-2">
      <UPress onPress={onBack}>
        <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
      </UPress>

      <UView className="flex-1 mx-4">
        {enableSearch && searchOpen && (
          <UInput
            autoFocus
            value={searchText}
            onChangeText={onSearchChange}
            placeholder="Filter applications"
            placeholderTextColor="#777"
            className="text-white text-lg p-0"
          />
        )}
      </UView>

      {enableSearch && (
        <UPress onPress={onSearchToggle}>
          <MaterialCommunityIcons name={searchOpen ? "close" : "magnify"} size={26} color="#fff" />
        </UPress>
      )}
    </UView>
  );
}
