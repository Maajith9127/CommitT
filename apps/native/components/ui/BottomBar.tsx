import { Ionicons } from "@expo/vector-icons";
import { View, TouchableOpacity } from "react-native";
import { withUniwind } from "uniwind";
import { FooterText } from "@/components/ui/text";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  
  // Map route names to icons
  const icons: Record<string, { icon: any; iconFilled: any; label: string }> = {
    commits: {
      icon: "shield-outline",
      iconFilled: "shield",
      label: "Commits",
    },
    schedules: { // This maps to "Calendar" in UI
      icon: "calendar-outline",
      iconFilled: "calendar",
      label: "Calendar",
    },
    strict: {
      icon: "lock-closed-outline",
      iconFilled: "lock-closed",
      label: "Strict",
    },
    notifications: {
      icon: "notifications-outline",
      iconFilled: "notifications",
      label: "Alerts",
    },
    profile: {
      icon: "person-outline",
      iconFilled: "person",
      label: "Profile",
    },
  };

  return (
    <UView className="flex-row justify-around py-4 pb-7 bg-black">
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        
        // Skip routes that don't have an icon mapping (e.g. index if it exists and isn't mapped)
        if (!icons[route.name]) return null;

        const { icon, iconFilled, label } = icons[route.name];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
             navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <UButton
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            className="flex-1 items-center"
          >
            <Ionicons 
              name={isFocused ? iconFilled : icon} 
              size={26} 
              color={isFocused ? "#4FA0FF" : "#9CA3AF"} 
            />
            <FooterText className={isFocused ? "text-[#4FA0FF]" : "text-gray-400"}>
              {label}
            </FooterText>
          </UButton>
        );
      })}
    </UView>
  );
}
