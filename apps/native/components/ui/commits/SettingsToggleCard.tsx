import React from "react";
import { View, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { CustomSwitch } from "../buttons/CustomSwitch";
import { THEME } from "@/constants/theme";

const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);

export type SettingsItem = {
  id: string;
  title: string;
  type?: "toggle" | "select";
  icon?: any;
  value?: boolean;
  onValueChange?: (val: boolean) => void;
  selectValue?: string;
  onPress?: () => void;
  disabled?: boolean;
};

type Props = {
  items: SettingsItem[];
  className?: string;
};

export function SettingsToggleCard({ items, className = "" }: Props) {
  return (
    <UView className={`w-full overflow-hidden ${className}`} style={{ backgroundColor: THEME.colors.surface, borderRadius: THEME.radii.card }}>
      {items.map((item, index) => (
        <UView key={item.id}>
          {item.type === "select" ? (
            <UButton 
              onPress={item.onPress}
              activeOpacity={0.7}
              disabled={item.disabled}
              className={`flex-row items-center justify-between px-5 py-4 pt-5 pb-5 ${item.disabled ? 'opacity-50' : ''}`}
            >
              <UView className="flex-row items-center">
                {item.icon && (
                  <MaterialCommunityIcons name={item.icon} size={30} color={THEME.colors.primary} style={{ marginRight: 12 }} />
                )}
                <HeaderTitle className="text-lg text-white">
                  {item.title}
                </HeaderTitle>
              </UView>
              <UView className="flex-row items-center">
                <FooterText className="mr-1 text-[16px]" style={{ color: THEME.colors.textMuted }}>{item.selectValue}</FooterText>
                <MaterialCommunityIcons name="chevron-right" size={24} color={THEME.colors.textMuted} />
              </UView>
            </UButton>
          ) : (
            <UView className="flex-row items-center justify-between px-5 py-4 pt-5 pb-5">
              <UView className="flex-row items-center">
                {item.icon && (
                  <MaterialCommunityIcons name={item.icon} size={30} color={THEME.colors.primary} style={{ marginRight: 12 }} />
                )}
                <HeaderTitle className="text-lg text-white">
                  {item.title}
                </HeaderTitle>
              </UView>
              <CustomSwitch
                value={item.value || false}
                onValueChange={item.onValueChange || (() => {})}
              />
            </UView>
          )}
          {index < items.length - 1 && (
            <UView className="h-[2px]" style={{ backgroundColor: THEME.colors.pureBlack }} />
          )}
        </UView>
      ))}
    </UView>
  );
}
