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

  /**
   * ** ENFORCEMENT ENGINE — INHERITANCE & OVERRIDE RESOLUTION **
   * 
   * This logic determines the "Effective Enforcement" state for a commitment. 
   * Ruleset:
   * 1. If a Time Window has internal 'conditions', it provides a "Surgical Override" 
   *    and ignores all Root Node conditions for that slot.
   * 2. If a Time Window is empty, it "Inherits" all Root Node conditions.
   * 3. 'hasLocationRisk' is true ONLY if a Physical Constraint (Location) exists 
   *    in the effective ruleset AND a Penalty is present.
   */
  const effectiveEnforcements = useMemo(() => {
    const rootConditions = conditionsData || [];
    const slots = recurrence?.time_windows || [];

    // ** RESOLVE: Does the current configuration include a physical location risk? **
    let locationIsActive = false;

    if (slots.length > 0) {
      // Check each slot for effective location
      locationIsActive = slots.some((slot: any) => {
        const hasOverrides = slot.conditions && slot.conditions.length > 0;
        if (hasOverrides) {
          // ** OVERRIDE: Check only internal slot conditions **
          return slot.conditions.some((c: any) => c.metric_key === "location" && c.target?.value?.lat);
        } else {
          // ** INHERIT: Check root conditions **
          return rootConditions.some(c => c.metric_key === "location" && c.target?.value?.lat);
        }
      });
    } else {
      // ** FALLBACK: Root-only enforcement **
      locationIsActive = rootConditions.some(c => c.metric_key === "location" && c.target?.value?.lat);
    }

    // ** RESOLVE: General enforcement presence for bottom-row shading **
    const hasDigital = slots.some((s: any) => s.conditions?.some((c: any) => c.metric_key === "digital_commitment")) || rootConditions.some(c => c.metric_key === "digital_commitment");
    const hasTime = slots.length > 0;

    return {
      locationIsActive,
      hasDigital,
      hasTime,
      showRisk: !!penalty && locationIsActive
    };
  }, [conditionsData, recurrence, penalty]);

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
                color={effectiveEnforcements.showRisk ? THEME.colors.primary : "rgba(255, 255, 255, 0.1)"} 
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
            <UView className="w-[20%] items-end pt-1 pr-1">
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
            {/* 1. TIME */}
            <MaterialCommunityIcons 
              name="clock" 
              size={30} 
              color={effectiveEnforcements.hasTime ? THEME.colors.primary : "rgba(255, 255, 255, 0.1)"} 
            />

            {/* 2. LOCATION */}
            <MaterialCommunityIcons 
              name="map-marker" 
              size={30} 
              color={effectiveEnforcements.locationIsActive ? THEME.colors.primary : "rgba(255, 255, 255, 0.1)"} 
            />

            {/* 3. APP LOCK */}
            <MaterialCommunityIcons 
              name="cellphone-lock" 
              size={30} 
              color={effectiveEnforcements.hasDigital ? THEME.colors.primary : "rgba(255, 255, 255, 0.1)"} 
            />

            {/* 4. CAMERA */}
            <MaterialCommunityIcons 
              name="camera" 
              size={30} 
              color={"rgba(255, 255, 255, 0.1)"} // Static for now based on rules
            />

            {/* 5. ACC PARTNER */}
            <MaterialCommunityIcons 
              name="account-group" 
              size={30} 
              color={"rgba(255, 255, 255, 0.1)"} // Static for now based on rules
            />
          </UView>
        </UView>
      )}
    </Pressable>
  );
}

