import React, { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { withUniwind } from "uniwind";

const UView = withUniwind(View);
const UText = withUniwind(Text);
const UPress = withUniwind(Pressable);
const UScroll = withUniwind(ScrollView);

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (from: { hour: number; minute: number; period: "AM" | "PM" }, to: { hour: number; minute: number; period: "AM" | "PM" }) => void;
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

  const setCurrentHour = (h: number) => activeTab === "FROM" ? setFromHour(h) : setToHour(h);
  const setCurrentMinute = (m: number) => activeTab === "FROM" ? setFromMinute(m) : setToMinute(m);
  const setCurrentPeriod = (p: "AM" | "PM") => activeTab === "FROM" ? setFromPeriod(p) : setToPeriod(p);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <UView className="flex-1 bg-black/70 justify-center items-center">
        
        {/* PICKER CARD */}
        <UView className="w-[85%] bg-[#1A1A1A] rounded-2xl overflow-hidden shadow-2xl">
          
          {/* FROM/TO TABS */}
          <UView className="flex-row">
            <UPress
              onPress={() => setActiveTab("FROM")}
              className={`flex-1 py-4 ${activeTab === "FROM" ? "bg-[#4FA0FF]" : "bg-gray-700"}`}
            >
              <UText className={`text-center font-bold text-lg ${activeTab === "FROM" ? "text-white" : "text-gray-400"}`}>
                FROM
              </UText>
            </UPress>
            <UPress
              onPress={() => setActiveTab("TO")}
              className={`flex-1 py-4 ${activeTab === "TO" ? "bg-[#4FA0FF]" : "bg-gray-700"}`}
            >
              <UText className={`text-center font-bold text-lg ${activeTab === "TO" ? "text-white" : "text-gray-400"}`}>
                TO
              </UText>
            </UPress>
          </UView>

          {/* TIME DISPLAY */}
          <UView className="bg-[#4FA0FF] py-8 items-center">
            <UText className="text-white text-6xl font-light">
              {currentHour}:{String(currentMinute).padStart(2, "0")} <UText className="text-white/70 text-4xl">{currentPeriod}</UText>
            </UText>
          </UView>

          {/* PICKERS */}
          <UView className="flex-row bg-[#1A1A1A] py-4 px-2">
            
            {/* HOUR */}
            <UView className="flex-1 items-center">
              <UText className="text-gray-400 text-xs font-semibold mb-2">HOUR</UText>
              <UScroll className="h-40" showsVerticalScrollIndicator={false}>
                {hours.map((h) => (
                  <UPress
                    key={h}
                    onPress={() => setCurrentHour(h)}
                    className={`py-3 px-4 rounded-lg mx-2 ${h === currentHour ? "bg-[#4FA0FF]" : ""}`}
                  >
                    <UText className={`text-center text-lg ${h === currentHour ? "text-white font-bold" : "text-gray-400"}`}>
                      {h}
                    </UText>
                  </UPress>
                ))}
              </UScroll>
            </UView>

            {/* MINUTE */}
            <UView className="flex-1 items-center">
              <UText className="text-gray-400 text-xs font-semibold mb-2">MINUTE</UText>
              <UScroll className="h-40" showsVerticalScrollIndicator={false}>
                {minutes.filter(m => m % 5 === 0).map((m) => (
                  <UPress
                    key={m}
                    onPress={() => setCurrentMinute(m)}
                    className={`py-3 px-4 rounded-lg mx-2 ${m === currentMinute ? "bg-[#4FA0FF]" : ""}`}
                  >
                    <UText className={`text-center text-lg ${m === currentMinute ? "text-white font-bold" : "text-gray-400"}`}>
                      {String(m).padStart(2, "0")}
                    </UText>
                  </UPress>
                ))}
              </UScroll>
            </UView>

            {/* AM/PM */}
            <UView className="flex-1 items-center">
              <UText className="text-gray-400 text-xs font-semibold mb-2">PERIOD</UText>
              <UView className="h-40 justify-center">
                <UPress
                  onPress={() => setCurrentPeriod("AM")}
                  className={`py-3 px-4 rounded-lg mb-3 ${currentPeriod === "AM" ? "bg-[#4FA0FF]" : ""}`}
                >
                  <UText className={`text-center text-lg ${currentPeriod === "AM" ? "text-white font-bold" : "text-gray-400"}`}>
                    AM
                  </UText>
                </UPress>
                <UPress
                  onPress={() => setCurrentPeriod("PM")}
                  className={`py-3 px-4 rounded-lg ${currentPeriod === "PM" ? "bg-[#4FA0FF]" : ""}`}
                >
                  <UText className={`text-center text-lg ${currentPeriod === "PM" ? "text-white font-bold" : "text-gray-400"}`}>
                    PM
                  </UText>
                </UPress>
              </UView>
            </UView>

          </UView>

          {/* FOOTER BUTTONS */}
          <UView className="bg-[#1A1A1A] px-6 py-4 flex-row justify-end border-t border-gray-800">
            <UPress onPress={onClose} className="mr-8 py-2 px-4">
              <UText className="text-gray-400 font-semibold text-base">CANCEL</UText>
            </UPress>
            <UPress
              onPress={() => {
                onSave(
                  { hour: fromHour, minute: fromMinute, period: fromPeriod },
                  { hour: toHour, minute: toMinute, period: toPeriod }
                );
                onClose();
              }}
              className="py-2 px-4"
            >
              <UText className="text-[#4FA0FF] font-semibold text-base">OK</UText>
            </UPress>
          </UView>

        </UView>

      </UView>
    </Modal>
  );
}
