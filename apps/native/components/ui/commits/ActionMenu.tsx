import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, View, TouchableOpacity } from "react-native";
import { withUniwind } from "uniwind";

import { FooterText } from "@/components/ui/text";

const UView = withUniwind(View);

export type ActionMenuItem = {
  icon: string;
  label: string;
  color?: string;
  onPress: () => void;
};

export type ActionMenuProps = {
  visible: boolean;
  onClose: () => void;
  items?: ActionMenuItem[];
  anchorPosition?: { x: number; y: number };
};

const defaultItems: ActionMenuItem[] = [
  {
    icon: "pause-circle-outline",
    label: "Pause",
    onPress: () => {},
  },
  {
    icon: "content-copy",
    label: "Duplicate",
    onPress: () => {},
  },
  {
    icon: "delete-outline",
    label: "Delete",
    color: "#4FA0FF",
    onPress: () => {},
  },
];

export function ActionMenu({
  visible,
  onClose,
  items = defaultItems,
  anchorPosition,
}: ActionMenuProps) {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop - closes menu when tapped (transparent) */}
      <Pressable 
        className="flex-1"
        onPress={onClose}
      >
        {/* Menu Container - positioned near the anchor */}
        <View
          style={{
            position: "absolute",
            top: (anchorPosition?.y ?? 200) + 10,
            right: 20,
            backgroundColor: "#151515",
            borderRadius: 12,
            paddingVertical: 8,
            paddingHorizontal: 4,
            minWidth: 160,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          {items.map((item, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={() => {
                item.onPress();
                onClose();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                paddingHorizontal: 16,
              }}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={22}
                color={item.color || "#FFFFFF"}
              />
              <FooterText
                className="ml-3 text-base"
                style={{ color: item.color || "#FFFFFF" }}
              >
                {item.label}
              </FooterText>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
