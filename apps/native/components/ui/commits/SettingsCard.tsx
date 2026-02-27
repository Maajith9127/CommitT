import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Pressable } from "react-native";
import { withUniwind } from "uniwind";
import { DigitalCommitItem } from "./DigitalCommitItem";

const UView = withUniwind(View);

type Props = {
  className?: string;
  onPress?: () => void;
};

export function SettingsCard({ className = "", onPress }: Props) {
  return (
    <Pressable onPress={onPress}>
      <UView className={`w-full rounded-3xl bg-[#1A1A1A] px-5 py-1 ${className}`}>
        <DigitalCommitItem
          title="Verification Style"
          items={[
            {
              id: "1",
              name: "Show Up",
              iconName: "shield-check-outline",
            },
          ]}
        />

        <UView className="h-[4px] bg-black -mx-5" />

        <DigitalCommitItem
          title="Grace Period"
          items={[
            {
              id: "2",
              name: "10 minutes",
              iconName: "timer-sand",
            },
          ]}
        />

        <UView className="h-[4px] bg-black -mx-5" />

        <DigitalCommitItem
          title="Smart Pre-Alarms"
          items={[
            { 
              id: "3", 
              name: "30 mins before", 
              iconName: "bell-ring-outline" 
            },
          ]}
          showBorder={false}
        />
      </UView>
    </Pressable>
  );
}
