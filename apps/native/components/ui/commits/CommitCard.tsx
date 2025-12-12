import { View } from "react-native";
import { withUniwind } from "uniwind";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { HeaderTitle, FooterText } from "@/components/ui/text";

const UView = withUniwind(View);

export type CommitCardProps = {
  title?: string;
  conditions?: number;
  iconName?: string;
  statusLabel?: string;
  className?: string;
};

export function CommitCard({
  title = "Focus",
  conditions = 2,
  iconName = "target",
  statusLabel = "Active",
  className = "",
}: CommitCardProps) {
  return (
    <UView
      className={`bg-[#1A1A1A] border border- rounded-3xl px-4 py-5 w-full ${className}`}
    >
      {/* ---------------------------------------------------------------- */}
      {/* MASTER ROW — 3 COLUMN GRID                                      */}
      {/* ---------------------------------------------------------------- */}
      <UView className="flex-row justify-between">
        {/* -------------------------------------------------------------- */}
        {/* LEFT COLUMN — STATUS BADGE                                     */}
        {/* -------------------------------------------------------------- */}
        <UView className="w-[25%] items-start pt-1">
          <UView className="flex-row items-center bg-[#2A2A2A] px-3 py-1 rounded-full">
            <MaterialCommunityIcons
              name="record-circle"
              size={16}
              color="#4FA0FF"
            />
            <FooterText className="text-blue-400 font-semibold ml-1">
              {statusLabel}
            </FooterText>
          </UView>
        </UView>

        {/* -------------------------------------------------------------- */}
        {/* CENTER COLUMN — ICON + TITLE + CONDITIONS                      */}
        {/* -------------------------------------------------------------- */}
        <UView className="w-[50%] items-center">
          <MaterialCommunityIcons name={iconName} size={45} color="#4FA0FF" />
          <HeaderTitle className="text-center mt-2">{title}</HeaderTitle>
          <FooterText className="text-center mt-1">
            {conditions} conditions
          </FooterText>
        </UView>

        {/* -------------------------------------------------------------- */}
        {/* RIGHT COLUMN — OPTIONS MENU (3 DOTS)                           */}
        {/* -------------------------------------------------------------- */}
        <UView className="w-[25%] items-end pt-1 pr-1">
          <MaterialCommunityIcons
            name="dots-vertical"
            size={26}
            color="#A0A0A0"
          />
        </UView>
      </UView>

      {/* ---------------------------------------------------------------- */}
      {/* BOTTOM ROW — EXTRA INFO (TIMER / PHONE)                        */}
      {/* ---------------------------------------------------------------- */}
      <UView className="flex-row justify-center gap-6 mt-4">
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
  );
}
