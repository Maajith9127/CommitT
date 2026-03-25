import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Pressable } from "react-native";
import { withUniwind } from "uniwind";
import { FooterText } from "@/components/ui/text";
import { DigitalCommitItem } from "./DigitalCommitItem";

const UView = withUniwind(View);

type Props = {
  className?: string;
  onPress?: () => void;
  apps?: any[];
  isAppsLoading?: boolean;
  selectedCount?: number;
};

export function CommitCard({ 
  className = "", 
  onPress, 
  apps = [],
  isAppsLoading = false,
  selectedCount = 0,
}: Props) {
  return (
    <UView className={`w-full rounded-3xl bg-[#1A1A1A] px-5 py-1 ${className}`}>
      {/* APPLICATIONS */}
      <DigitalCommitItem
        title="Applications"
        onPress={onPress}
        isLoading={isAppsLoading}
        items={
          apps.length > 0
            ? apps
            : [
                {
                  id: "1",
                  name: "AC Remote Control",
                  iconName: "apps",
                },
              ]
        }
        icons={
          <>
            <MaterialCommunityIcons name="grid" size={18} color="#4FA0FF" />
            <FooterText className="ml-1 text-blue-400">0</FooterText>

            <MaterialCommunityIcons
              name="cellphone"
              size={18}
              color="#4FA0FF"
              style={{ marginLeft: 12 }}
            />
            <FooterText className="ml-1 text-blue-400">
              {selectedCount}
            </FooterText>
          </>
        }
      />

      <UView className="h-[2px] bg-black -mx-5" />

      {/* WEBSITES */}
      <DigitalCommitItem
        title="Websites"
        onPress={onPress}
        items={[
          {
            id: "w1",
            name: "youtube.com",
            iconName: "web",
          },
          {
            id: "w2",
            name: "facebook.com",
            iconName: "web",
          },
          {
            id: "w3",
            name: "instagram.com",
            iconName: "web",
          },
        ]}
        icons={
          <>
            <MaterialCommunityIcons name="web" size={18} color="#4FA0FF" />
            <FooterText className="ml-1 text-blue-400">3</FooterText>
          </>
        }
      />

      <UView className="h-[2px] bg-black -mx-5" />

      {/* DESCRIBE TO AI */}
      <DigitalCommitItem
        title="Describe to AI"
        onPress={onPress}
        items={[
          { id: "ai1", name: "Block all 18+ sites" },
          { id: "ai2", name: "Restrict social media during study time" },
        ]}
        showBorder={false}
        icons={
          <>
            <MaterialCommunityIcons name="robot-outline" size={18} color="#4FA0FF" />
            <FooterText className="ml-1 text-blue-400">2</FooterText>
          </>
        }
      />
    </UView>
  );
}
