import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Pressable } from "react-native";
import { withUniwind } from "uniwind";
import { FooterText } from "@/components/ui/text";
import { THEME } from "@/constants/theme";
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
    <UView className={`w-full ${className}`} style={{ backgroundColor: THEME.colors.surface, borderRadius: THEME.radii.card, paddingHorizontal: 20, paddingVertical: 4 }}>
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
            <MaterialCommunityIcons name="grid" size={18} color={THEME.colors.primary} />
            <FooterText className="ml-1" style={{ color: THEME.colors.primary }}>0</FooterText>

            <MaterialCommunityIcons
              name="cellphone"
              size={18}
              color={THEME.colors.primary}
              style={{ marginLeft: 12 }}
            />
            <FooterText className="ml-1" style={{ color: THEME.colors.primary }}>
              {selectedCount}
            </FooterText>
          </>
        }
      />

      <UView className="h-[2px] -mx-5" style={{ backgroundColor: THEME.colors.pureBlack }} />

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
            <MaterialCommunityIcons name="web" size={18} color={THEME.colors.primary} />
            <FooterText className="ml-1" style={{ color: THEME.colors.primary }}>3</FooterText>
          </>
        }
      />

      <UView className="h-[2px] -mx-5" style={{ backgroundColor: THEME.colors.pureBlack }} />

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
            <MaterialCommunityIcons name="robot-outline" size={18} color={THEME.colors.primary} />
            <FooterText className="ml-1" style={{ color: THEME.colors.primary }}>2</FooterText>
          </>
        }
      />
    </UView>
  );
}
