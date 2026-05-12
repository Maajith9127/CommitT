import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, View, TouchableOpacity } from "react-native";
import { withUniwind } from "uniwind";

import { FooterText } from "@/components/ui/text";
import { THEME } from "@/constants/theme";

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
    color: THEME.colors.danger,
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
            backgroundColor: THEME.colors.surface,
            borderRadius: THEME.radii.md,
            paddingVertical: 8,
            paddingHorizontal: 4,
            minWidth: 160,
            shadowColor: THEME.colors.pureBlack,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            borderWidth: 1,
            borderColor: THEME.colors.surfaceLight,
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
                size={26}
                color={item.color || THEME.colors.textMain}
              />
              <FooterText
                className="ml-4 text-xl"
                style={{ color: item.color || THEME.colors.textMain }}
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
