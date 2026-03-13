import { View, Pressable } from "react-native";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthTitle } from "@/components/ui/text";

const UView = withUniwind(View);
const UPress = withUniwind(Pressable);

type SelectableListItemProps = {
  icon: "cellphone" | "web";
  label: string;
  selected: boolean;
  onToggle: () => void;
};

export function SelectableListItem({ icon, label, selected, onToggle }: SelectableListItemProps) {
  return (
    <UPress onPress={onToggle}>
      <UView className="flex-row items-center py-3 border-b border-[#2A2A2A] -mx-4 px-4">
        <UView className="flex-row items-center flex-1">
          {icon === "cellphone" ? (
            <UView className="w-10 h-10 mr-3 rounded-lg bg-[#1A1A1A] items-center justify-center">
              <MaterialCommunityIcons name="cellphone" size={20} color="#4FA0FF" />
            </UView>
          ) : (
            <MaterialCommunityIcons
              name="web"
              size={20}
              color="#4FA0FF"
              style={{ marginRight: 12 }}
            />
          )}
          <AuthTitle className="mb-0 text-white text-base font-normal">{label}</AuthTitle>
        </UView>

        <MaterialCommunityIcons
          name={selected ? "checkbox-marked" : "checkbox-blank-outline"}
          size={22}
          color={selected ? "#4FA0FF" : "#777"}
        />
      </UView>
    </UPress>
  );
}
