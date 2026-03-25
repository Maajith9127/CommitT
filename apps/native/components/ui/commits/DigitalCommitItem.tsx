import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";
import { FooterText, HeaderTitle } from "@/components/ui/text";

const UView = withUniwind(View);
const UPress = withUniwind(View);
const UScroll = withUniwind(ScrollView);

type Item = {
  id: string;
  name: string;
  icon?: string;
  iconName?: string;
  iconColor?: string;
  iconSize?: number;
};

type Props = {
  title: string;
  items: Item[];
  icons?: React.ReactNode;
  showBorder?: boolean;
  accentColor?: string; // icon color
  titleColor?: string; // title color
};

export function DigitalCommitItem({
  title,
  items,
  icons,
  showBorder = true,
  accentColor = "#4FA0FF",
  titleColor = "#FFFFFF",
}: Props) {
  return (
    <UPress className="py-3">
      {/* TITLE ROW */}
      <UView className="flex-row items-center justify-between">
        <HeaderTitle className="text-lg" style={{ color: titleColor }}>
          {title}
        </HeaderTitle>

        <UView className="flex-row items-center">{icons}</UView>
      </UView>

      {/* ITEMS */}
      {items.length > 0 && (
        <UScroll
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: "row" }}
          className="mt-3"
        >
          {items.map((item) => (
            <UView key={item.id} className="mr-5 flex-row items-center">
              {item.icon ? (
                <Image
                  source={{ uri: item.icon }}
                  style={{ width: 32, height: 32, borderRadius: 8 }}
                />
              ) : item.iconName ? (
                <MaterialCommunityIcons
                  name={item.iconName as any}
                  size={item.iconSize ?? 24}
                  color={item.iconColor ?? accentColor}
                />
              ) : null}

              <FooterText className="ml-3 text-gray-400 text-sm">{item.name}</FooterText>
            </UView>
          ))}
        </UScroll>
      )}
    </UPress>
  );
}