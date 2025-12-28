import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UView = withUniwind(View);
const UText = withUniwind(Text);
const UPress = withUniwind(Pressable);
const UScroll = withUniwind(ScrollView);

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (
    from: { hour: number; minute: number; period: "AM" | "PM" },
    to: { hour: number; minute: number; period: "AM" | "PM" },
  ) => void;
};

export function TimePicker({ visible, onClose, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<"FROM" | "TO">("FROM");

  const [fromHour, setFromHour] = useState(6);
  const [fromMinute, setFromMinute] = useState(0);
  const [fromPeriod, setFromPeriod] = useState<"AM" | "PM">("AM");

  const [toHour, setToHour] = useState(8);
  const [toMinute, setToMinute] = useState(0);
  const [toPeriod, setToPeriod] = useState<"AM" | "PM">("AM");

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const currentHour = activeTab === "FROM" ? fromHour : toHour;
  const currentMinute = activeTab === "FROM" ? fromMinute : toMinute;
  const currentPeriod = activeTab === "FROM" ? fromPeriod : toPeriod;

  const setCurrentHour = (h: number) => (activeTab === "FROM" ? setFromHour(h) : setToHour(h));
  const setCurrentMinute = (m: number) =>
    activeTab === "FROM" ? setFromMinute(m) : setToMinute(m);
  const setCurrentPeriod = (p: "AM" | "PM") =>
    activeTab === "FROM" ? setFromPeriod(p) : setToPeriod(p);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <UView className="flex-1 items-center justify-center bg-black/70">
        {/* PICKER CARD */}
        <UView className="w-[85%] overflow-hidden rounded-2xl bg-[#1A1A1A] shadow-2xl">
          {/* FROM/TO TABS */}
          <UView className="flex-row">
            <UPress
              onPress={() => setActiveTab("FROM")}
              className={`flex-1 py-4 ${activeTab === "FROM" ? "bg-[#4FA0FF]" : "bg-gray-700"}`}
            >
              <UText
                className={`text-center font-bold text-lg ${activeTab === "FROM" ? "text-white" : "text-gray-400"}`}
              >
                FROM
              </UText>
            </UPress>
            <UPress
              onPress={() => setActiveTab("TO")}
              className={`flex-1 py-4 ${activeTab === "TO" ? "bg-[#4FA0FF]" : "bg-gray-700"}`}
            >
              <UText
                className={`text-center font-bold text-lg ${activeTab === "TO" ? "text-white" : "text-gray-400"}`}
              >
                TO
              </UText>
            </UPress>
          </UView>

          {/* TIME DISPLAY */}
          <UView className="items-center bg-[#4FA0FF] py-8">
            <UText className="font-light text-6xl text-white">
              {currentHour}:{String(currentMinute).padStart(2, "0")}{" "}
              <UText className="text-4xl text-white/70">{currentPeriod}</UText>
            </UText>
          </UView>

          {/* PICKERS */}
          <UView className="flex-row bg-[#1A1A1A] px-2 py-4">
            {/* HOUR */}
            <UView className="flex-1 items-center">
              <UText className="mb-2 font-semibold text-gray-400 text-xs">HOUR</UText>
              <UScroll className="h-40" showsVerticalScrollIndicator={false}>
                {hours.map((h) => (
                  <UPress
                    key={h}
                    onPress={() => setCurrentHour(h)}
                    className={`mx-2 rounded-lg px-4 py-3 ${h === currentHour ? "bg-[#4FA0FF]" : ""}`}
                  >
                    <UText
                      className={`text-center text-lg ${h === currentHour ? "font-bold text-white" : "text-gray-400"}`}
                    >
                      {h}
                    </UText>
                  </UPress>
                ))}
              </UScroll>
            </UView>

            {/* MINUTE */}
            <UView className="flex-1 items-center">
              <UText className="mb-2 font-semibold text-gray-400 text-xs">MINUTE</UText>
              <UScroll className="h-40" showsVerticalScrollIndicator={false}>
                {minutes
                  .filter((m) => m % 5 === 0)
                  .map((m) => (
                    <UPress
                      key={m}
                      onPress={() => setCurrentMinute(m)}
                      className={`mx-2 rounded-lg px-4 py-3 ${m === currentMinute ? "bg-[#4FA0FF]" : ""}`}
                    >
                      <UText
                        className={`text-center text-lg ${m === currentMinute ? "font-bold text-white" : "text-gray-400"}`}
                      >
                        {String(m).padStart(2, "0")}
                      </UText>
                    </UPress>
                  ))}
              </UScroll>
            </UView>

            {/* AM/PM */}
            <UView className="flex-1 items-center">
              <UText className="mb-2 font-semibold text-gray-400 text-xs">PERIOD</UText>
              <UView className="h-40 justify-center">
                <UPress
                  onPress={() => setCurrentPeriod("AM")}
                  className={`mb-3 rounded-lg px-4 py-3 ${currentPeriod === "AM" ? "bg-[#4FA0FF]" : ""}`}
                >
                  <UText
                    className={`text-center text-lg ${currentPeriod === "AM" ? "font-bold text-white" : "text-gray-400"}`}
                  >
                    AM
                  </UText>
                </UPress>
                <UPress
                  onPress={() => setCurrentPeriod("PM")}
                  className={`rounded-lg px-4 py-3 ${currentPeriod === "PM" ? "bg-[#4FA0FF]" : ""}`}
                >
                  <UText
                    className={`text-center text-lg ${currentPeriod === "PM" ? "font-bold text-white" : "text-gray-400"}`}
                  >
                    PM
                  </UText>
                </UPress>
              </UView>
            </UView>
          </UView>

          {/* FOOTER BUTTONS */}
          <UView className="flex-row justify-end border-gray-800 border-t bg-[#1A1A1A] px-6 py-4">
            <UPress onPress={onClose} className="mr-8 px-4 py-2">
              <UText className="font-semibold text-base text-gray-400">CANCEL</UText>
            </UPress>
            <UPress
              onPress={() => {
                onSave(
                  { hour: fromHour, minute: fromMinute, period: fromPeriod },
                  { hour: toHour, minute: toMinute, period: toPeriod },
                );
                onClose();
              }}
              className="px-4 py-2"
            >
              <UText className="font-semibold text-[#4FA0FF] text-base">OK</UText>
            </UPress>
          </UView>
        </UView>
      </UView>
    </Modal>
  );
}
