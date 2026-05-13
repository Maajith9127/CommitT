import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRef } from "react";
import { Pressable, View, TouchableOpacity } from "react-native";
import { withUniwind } from "uniwind";
import { THEME } from "@/constants/theme";

import { FooterText, HeaderTitle } from "@/components/ui/text";

const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);

export type CommitCardProps = {
  title?: string;
  conditions?: number;
  iconName?: any;
  statusLabel?: string;
  className?: string;
  onPress?: () => void;
  onOptionsPress?: (position: { x: number; y: number }) => void;
};

export function CommitCard({
  title = "Focus",
  conditions = 2,
  iconName = "target",
  statusLabel = "Active",
  className = "",
  onPress,
  onOptionsPress,
}: CommitCardProps) {
  const dotsRef = useRef<View>(null);

  const handleOptionsPress = () => {
    if (dotsRef.current) {
      dotsRef.current.measureInWindow((x, y, width, height) => {
        onOptionsPress?.({ x: x + width, y: y + height });
      });
    } else {
      onOptionsPress?.({ x: 0, y: 200 });
    }
  };

  return (
    <Pressable onPress={onPress}>
      {({ pressed }: { pressed: boolean }) => (
        <UView
          className={`w-full ${className}`}
          style={{
            backgroundColor: pressed ? THEME.colors.surfaceElevated : THEME.colors.surface,
            borderRadius: THEME.radii.card,
            paddingHorizontal: THEME.spacing.lg,
            paddingVertical: THEME.spacing.xl,
            transform: [{ scale: 1 }],
          }}
        >
          {/* ---------------------------------------------------------------- */}
          {/* MASTER ROW — 3 COLUMN GRID                                      */}
          {/* ---------------------------------------------------------------- */}
          <UView className="flex-row justify-between">
            {/* -------------------------------------------------------------- */}
            {/* LEFT COLUMN — STATUS BADGE                                     */}
            {/* -------------------------------------------------------------- */}
            <UView className="w-[25%] items-start pt-1">
              <UView className="flex-row items-center" style={{ backgroundColor: THEME.colors.surfaceElevated, borderRadius: THEME.radii.full, paddingHorizontal: THEME.spacing.md, paddingVertical: THEME.spacing.xs }}>
                <MaterialCommunityIcons name="record-circle" size={16} color={THEME.colors.primary} />
                <FooterText className="ml-1 font-semibold" style={{ color: THEME.colors.primary }}>{statusLabel}</FooterText>
              </UView>
            </UView>

            {/* -------------------------------------------------------------- */}
            {/* CENTER COLUMN — ICON + TITLE                                   */}
            {/* -------------------------------------------------------------- */}
            <UView className="w-[50%] items-center">
              <MaterialCommunityIcons name={iconName} size={45} color={THEME.colors.primary} />
              <HeaderTitle className="mt-2 text-center">{title}</HeaderTitle>
            </UView>

            {/* -------------------------------------------------------------- */}
            {/* RIGHT COLUMN — OPTIONS MENU (3 DOTS)                           */}
            {/* -------------------------------------------------------------- */}
            <UView className="w-[25%] items-end pt-1 pr-1">
              <TouchableOpacity
                onPress={handleOptionsPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View ref={dotsRef} collapsable={false}>
                  <MaterialCommunityIcons name="dots-vertical" size={26} color={THEME.colors.textMuted} />
                </View>
              </TouchableOpacity>
            </UView>
          </UView>

          {/* Standard Settings-Style Divider (Edge-to-Edge) */}
          <UView 
            className="h-[1px] mt-6" 
            style={{ 
              backgroundColor: THEME.colors.border,
              marginHorizontal: -THEME.spacing.lg // Bleed to edges
            }} 
          />

          {/* ---------------------------------------------------------------- */}
          {/* BOTTOM ROW — EXTRA INFO (TIMER / PHONE)                        */}
          {/* ---------------------------------------------------------------- */}
          <UView className="mt-4 flex-row justify-center gap-6">
            {/* TIME ICON */}
            <UView className="flex-row items-center">
              <MaterialCommunityIcons name="clock-outline" size={26} color={THEME.colors.textMuted} />
              <FooterText className="ml-1">•</FooterText>
            </UView>

            {/* PHONE ICON + COUNT */}
            <UView className="flex-row items-center">
              <MaterialCommunityIcons name="cellphone" size={26} color={THEME.colors.textMuted} />
              <FooterText className="ml-1">1</FooterText>
            </UView>
          </UView>
        </UView>
      )}
    </Pressable>
  );
}

