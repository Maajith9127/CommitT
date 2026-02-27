import React from "react";
import { View, Switch, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { withUniwind } from "uniwind";
import { HeaderTitle, FooterText } from "@/components/ui/text";

const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);

export type SettingsItem = {
  id: string;
  title: string;
  type?: "toggle" | "select";
  value?: boolean;
  onValueChange?: (val: boolean) => void;
  selectValue?: string;
  onPress?: () => void;
};

type Props = {
  items: SettingsItem[];
  className?: string;
};

export function SettingsToggleCard({ items, className = "" }: Props) {
  return (
    <UView className={`w-full rounded-3xl bg-[#1A1A1A] overflow-hidden ${className}`}>
      {items.map((item, index) => (
        <UView key={item.id}>
          {item.type === "select" ? (
            <UButton 
              onPress={item.onPress}
              activeOpacity={0.7}
              className="flex-row items-center justify-between px-5 py-4 pt-5 pb-5"
            >
              <HeaderTitle className="text-lg text-white">
                {item.title}
              </HeaderTitle>
              <UView className="flex-row items-center">
                <FooterText className="mr-1 text-[#A0A0A5] text-[16px]">{item.selectValue}</FooterText>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#666666" />
              </UView>
            </UButton>
          ) : (
            <UView className="flex-row items-center justify-between px-5 py-4 pt-5 pb-5">
              <HeaderTitle className="text-lg text-white">
                {item.title}
              </HeaderTitle>
              <Switch
                value={item.value}
                onValueChange={item.onValueChange}
                trackColor={{ true: "#4FA0FF", false: "#39393D" }}
                ios_backgroundColor="#39393D"
              />
            </UView>
          )}
          {index < items.length - 1 && (
            <UView className="h-[2px] bg-black" />
          )}
        </UView>
      ))}
    </UView>
  );
}
