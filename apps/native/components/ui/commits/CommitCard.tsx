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
  recurrence?: any;
  conditionsData?: any[];
  penalty?: any;
};

export function CommitCard({
  title = "Focus",
  conditions = 2,
  iconName = "target",
  statusLabel = "Active",
  className = "",
  onPress,
  onOptionsPress,
  recurrence,
  conditionsData = [],
  penalty,
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

  const hasEnforcements = recurrence?.time_windows?.length > 0 || conditionsData?.some(c => ["location", "digital_commitment"].includes(c.metric_key));

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
            {/* LEFT COLUMN — THREAT MONITOR HUD (SKULL-SCAN)                 */}
            {/* -------------------------------------------------------------- */}
            <UView className="w-[20%] items-start pt-1">
              <MaterialCommunityIcons 
                name="skull-scan" 
                size={22} 
                color={penalty ? THEME.colors.primary : "rgba(255, 255, 255, 0.1)"} 
              />
            </UView>

            {/* -------------------------------------------------------------- */}
            {/* CENTER COLUMN — ICON + TITLE                                   */}
            {/* -------------------------------------------------------------- */}
            <UView className="w-[60%] items-center">
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
          {/* BOTTOM ROW — ENFORCEMENT DASHBOARD (Static Set)                */}
          {/* ---------------------------------------------------------------- */}
          <UView className="mt-4 flex-row justify-center gap-6">
            {/* Helper to scan all condition locations */}
            {(() => {
              const hasCondition = (key: string) => {
                // 1. Check Global Conditions
                const globalMatch = conditionsData.find(c => c.metric_key === key);
                if (globalMatch) {
                  const val = globalMatch.target?.value;
                  if (key === "location" && val?.lat && val?.lng) return true;
                  if (key === "digital_commitment" && val?.apps?.length > 0) return true;
                  if (val) return true; // Fallback for other keys
                }

                // 2. Check Per-Time-Slot Conditions
                const slotMatch = recurrence?.time_windows?.some((w: any) => 
                  w.conditions?.some((c: any) => {
                    if (c.metric_key !== key) return false;
                    const val = c.target?.value;
                    if (key === "location" && val?.lat && val?.lng) return true;
                    if (key === "digital_commitment" && val?.apps?.length > 0) return true;
                    return !!val;
                  })
                );
                
                return !!slotMatch;
              };

              return (
                <>
                  {/* 1. TIME */}
                  <MaterialCommunityIcons 
                    name="clock" 
                    size={30} 
                    color={recurrence?.time_windows?.length > 0 ? THEME.colors.primary : "rgba(255, 255, 255, 0.1)"} 
                  />

                  {/* 2. LOCATION */}
                  <MaterialCommunityIcons 
                    name="map-marker" 
                    size={30} 
                    color={hasCondition("location") ? THEME.colors.primary : "rgba(255, 255, 255, 0.1)"} 
                  />

                  {/* 3. APP LOCK */}
                  <MaterialCommunityIcons 
                    name="cellphone-lock" 
                    size={30} 
                    color={hasCondition("digital_commitment") ? THEME.colors.primary : "rgba(255, 255, 255, 0.1)"} 
                  />

                  {/* 4. CAMERA */}
                  <MaterialCommunityIcons 
                    name="camera" 
                    size={30} 
                    color={hasCondition("camera") ? THEME.colors.primary : "rgba(255, 255, 255, 0.1)"} 
                  />

                  {/* 5. ACC PARTNER */}
                  <MaterialCommunityIcons 
                    name="account-group" 
                    size={30} 
                    color={hasCondition("accountability") ? THEME.colors.primary : "rgba(255, 255, 255, 0.1)"} 
                  />
                </>
              );
            })()}
          </UView>
        </UView>
      )}
    </Pressable>
  );
}

