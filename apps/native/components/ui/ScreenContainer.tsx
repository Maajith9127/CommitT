import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";
import { HeaderTitle } from "./text"; // using your existing titles
import { THEME } from "@/constants/theme";

const UView = withUniwind(View);

// ------------------------------------------
// SCREEN CONTAINER (existing, untouched)
// ------------------------------------------
type ScreenContainerProps = {
  children: ReactNode;
  center?: boolean;
  className?: string;
  style?: any;
};

export function ScreenContainer({
  children,
  center = false,
  className = "",
  style,
}: ScreenContainerProps) {
  const baseClasses = "flex-1 px-6 py-6 w-full";
  const centerClasses = center ? "justify-center items-center" : "";
  const combinedClasses = `${baseClasses} ${centerClasses} ${className}`.trim();

  return <UView className={combinedClasses} style={style}>{children}</UView>;
}

// ------------------------------------------
// SCREEN HEADER (new, added as you asked)
// ------------------------------------------
import { SafeAreaView } from "react-native-safe-area-context";

const USafeAreaView = withUniwind(SafeAreaView);

export function ScreenHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <USafeAreaView
      edges={['top']}
      className={`pr-4 pb-5 pl-4 ${className}`}
      style={{ backgroundColor: THEME.colors.pureBlack }}
    >
      {children}
    </USafeAreaView>
  );
}
