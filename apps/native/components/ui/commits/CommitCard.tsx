import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { withUniwind } from "uniwind";

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
};

export function CommitCard({
  title = "Focus",
  conditions = 2,
  iconName = "target",
  statusLabel = "Active",
  className = "",
  onPress,
}: CommitCardProps) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }: { pressed: boolean }) => (
        <UView
          className={`border- w-full rounded-3xl border px-4 py-5 ${className}`}
          style={{
            backgroundColor: pressed ? "#222222" : "#1A1A1A",
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
              <UView className="flex-row items-center rounded-full bg-[#2A2A2A] px-3 py-1">
                <MaterialCommunityIcons name="record-circle" size={16} color="#4FA0FF" />
                <FooterText className="ml-1 font-semibold text-blue-400">{statusLabel}</FooterText>
              </UView>
            </UView>

            {/* -------------------------------------------------------------- */}
            {/* CENTER COLUMN — ICON + TITLE + CONDITIONS                      */}
            {/* -------------------------------------------------------------- */}
            <UView className="w-[50%] items-center">
              <MaterialCommunityIcons name={iconName} size={45} color="#4FA0FF" />
              <HeaderTitle className="mt-2 text-center">{title}</HeaderTitle>
              <FooterText className="mt-1 text-center">{conditions} conditions</FooterText>
            </UView>

            {/* -------------------------------------------------------------- */}
            {/* RIGHT COLUMN — OPTIONS MENU (3 DOTS)                           */}
            {/* -------------------------------------------------------------- */}
            <UView className="w-[25%] items-end pt-1 pr-1">
              <MaterialCommunityIcons name="dots-vertical" size={26} color="#A0A0A0" />
            </UView>
          </UView>

          {/* ---------------------------------------------------------------- */}
          {/* BOTTOM ROW — EXTRA INFO (TIMER / PHONE)                        */}
          {/* ---------------------------------------------------------------- */}
          <UView className="mt-4 flex-row justify-center gap-6">
            {/* TIME ICON */}
            <UView className="flex-row items-center">
              <MaterialCommunityIcons name="timer" size={16} color="#8A8A8A" />
              <FooterText className="ml-1">•</FooterText>
            </UView>

            {/* PHONE ICON + COUNT */}
            <UView className="flex-row items-center">
              <MaterialCommunityIcons name="cellphone" size={16} color="#8A8A8A" />
              <FooterText className="ml-1">1</FooterText>
            </UView>
          </UView>
        </UView>
      )}
    </Pressable>
  );
}
