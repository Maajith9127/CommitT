import { View, ScrollView, Text } from "react-native";
import { withUniwind } from "uniwind";
import { useState } from "react";

import { ScreenHeader } from "@/components/ui";
import { HeaderTitle } from "@/components/ui/text";
import { PrimaryButton, AddButton } from "@/components/ui/button";

import { DaySelector } from "@/components/ui/time/DaySelector";
import { TimeSlotCard } from "@/components/ui/time/TimeSlotCard";
import { router } from "expo-router";

//  Correct import (named export)
import { TimePicker } from "@/components/ui/time/TimePicker";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UText = withUniwind(Text);

export default function TimeSetScreen() {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  return (
    <UView className="flex-1 bg-black">

      {/* HEADER */}
      <ScreenHeader>
        <HeaderTitle className="text-blue-400 text-3xl mt-16">
          Active Time
        </HeaderTitle>

        <UText className="text-left text-gray-400 mt-1 mb-0 text-base">
          Choose when this commitment is active
        </UText>
      </ScreenHeader>

      {/* MAIN CONTENT */}
      <UScroll className="flex-1 px-4 mt-6">

        {/* DAYS */}
        <UView className="mb-6">
          <UText className="text-gray-300 text-lg mb-3">Days</UText>

          <DaySelector value={selectedDays} onChange={setSelectedDays} />
        </UView>

        {/* TIMES */}
        <UView className="mb-6">
          <UText className="text-gray-300 text-lg mb-3">Times</UText>

          <TimeSlotCard startTime="6:00 am" endTime="8:00 am" />
          <TimeSlotCard startTime="9:00 am" endTime="10:00 am" />
          <TimeSlotCard startTime="12:00 pm" endTime="2:00 pm" />
          <TimeSlotCard startTime="4:00 pm" endTime="6:00 pm" />
          <TimeSlotCard startTime="8:00 pm" endTime="10:00 pm" />

          {/* ADD BUTTON */}
          <UView className="w-[25%] mt-2">
            <AddButton onPress={() => setPickerVisible(true)} />
          </UView>

        </UView>

      </UScroll>

      {/* SAVE BUTTON */}
      <UView className="px-4 mb-8">
        <PrimaryButton
          onPress={() => {
            router.push("/final");
          }}
        >
          Save
        </PrimaryButton>
      </UView>

      {/* POPUP */}
      <TimePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSave={(from, to) => {
          console.log("Picked Time Range →", { from, to });
          // from: { hour: 6, minute: 0, period: "AM" }
          // to: { hour: 8, minute: 0, period: "AM" }
        }}
      />
    </UView>
  );
}
