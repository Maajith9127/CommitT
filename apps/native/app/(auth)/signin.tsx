import { View, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { AuthForm } from "@/components/auth/AuthForm";
import { THEME } from "@/constants/theme";

export default function Signin() {
  return (
    <View style={{ flex: 1 }}>
      {/* PROGRAMMATIC GRADIENT BACKGROUND */}
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={THEME.colors.primary} stopOpacity="0.8" />
            <Stop offset="55%" stopColor={THEME.colors.pureBlack} stopOpacity="1" />
            <Stop offset="100%" stopColor={THEME.colors.pureBlack} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad)" />
      </Svg>

      <AuthForm />
    </View>
  );
}
