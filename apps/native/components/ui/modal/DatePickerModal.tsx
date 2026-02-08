import React, { useState, useEffect } from "react";
import { Modal, Pressable, View, Text } from "react-native";
import { withUniwind } from "uniwind";
import dayjs from "dayjs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeaderTitle } from "@/components/ui/text";

// Uniwind components matched to ConfirmationModal usage
const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);
const UText = withUniwind(Text);

interface DatePickerModalProps {
  isVisible: boolean;
  onClose: () => void;
  date: string; // ISO string
  onDateChange: (date: string) => void;
}

export function DatePickerModal({ isVisible, onClose, date, onDateChange }: DatePickerModalProps) {
  const [currentDate, setCurrentDate] = useState(dayjs(date));

  useEffect(() => {
    if (isVisible) {
      setCurrentDate(dayjs(date));
    }
  }, [isVisible, date]);

  const startOfMonth = currentDate.startOf("month");
  const startDayOfWeek = startOfMonth.day(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = currentDate.daysInMonth();

  const handlePrevMonth = () => setCurrentDate(currentDate.subtract(1, "month"));
  const handleNextMonth = () => setCurrentDate(currentDate.add(1, "month"));
  
  const handlePrevYear = () => setCurrentDate(currentDate.subtract(1, "year"));
  const handleNextYear = () => setCurrentDate(currentDate.add(1, "year"));

  const handleDayPress = (day: number) => {
    const newDate = currentDate.date(day);
    onDateChange(newDate.toISOString());
    onClose();
  };

  // Generate grid
  const days = [];
  // Empty slots
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  // Data slots
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop - Matched ConfirmationModal */}
      <View
        style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 30,
        }}
      >
        <UPressable 
            style={{ width: '100%', height: '100%', position: 'absolute' }}
            onPress={onClose}
        />

        {/* Modal Content - Matched ConfirmationModal styles */}
        <UView className="w-full rounded-3xl bg-[#252525] p-5 shadow-xl">
            {/* Header */}
            <UView className="flex-row justify-between items-center mb-6">
                 <UView className="flex-row items-center">
                    <UPressable onPress={handlePrevYear} className="p-2"><MaterialCommunityIcons name="chevron-double-left" size={24} color="#a1a1aa"/></UPressable>
                    <UPressable onPress={handlePrevMonth} className="p-2"><MaterialCommunityIcons name="chevron-left" size={24} color="#a1a1aa"/></UPressable>
                 </UView>
                 
                 <HeaderTitle className="text-white text-lg font-bold">
                    {currentDate.format("MMMM YYYY")}
                 </HeaderTitle>
                 
                 <UView className="flex-row items-center">
                    <UPressable onPress={handleNextMonth} className="p-2"><MaterialCommunityIcons name="chevron-right" size={24} color="#a1a1aa"/></UPressable>
                    <UPressable onPress={handleNextYear} className="p-2"><MaterialCommunityIcons name="chevron-double-right" size={24} color="#a1a1aa"/></UPressable>
                 </UView>
            </UView>

            {/* Days Header */}
            <UView className="flex-row justify-between mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => (
                    <UText key={i} className="text-zinc-500 w-[14%] text-center font-medium">{d}</UText>
                ))}
            </UView>

            {/* Days Grid */}
            <UView className="flex-row flex-wrap">
                {days.map((day, index) => {
                    if (day === null) {
                        return <UView key={`empty-${index}`} className="w-[14%] aspect-square" />;
                    }
                    
                    const isSelected = dayjs(date).isSame(currentDate, 'month') && dayjs(date).year() === currentDate.year() && dayjs(date).date() === day;
                    const isToday = dayjs().isSame(currentDate, 'month') && dayjs().year() === currentDate.year() && dayjs().date() === day;
                    
                    return (
                        <UPressable 
                            key={`day-${day}`}
                            className={`w-[14%] aspect-square justify-center items-center rounded-full mb-1 ${isSelected ? "bg-[#4FA0FF]" : ""}`}
                            onPress={() => handleDayPress(day)}
                        >
                            <UText className={`${isSelected ? "text-white font-bold" : isToday ? "text-[#4FA0FF] font-bold" : "text-zinc-300"}`}>
                                {day}
                            </UText>
                        </UPressable>
                    );
                })}
            </UView>

            <UPressable className="mt-4 self-center py-2 px-6 rounded-full bg-[#333]" onPress={onClose}>
                <UText className="text-zinc-400 font-medium">Cancel</UText>
            </UPressable>

        </UView>
      </View>
    </Modal>
  );
}
