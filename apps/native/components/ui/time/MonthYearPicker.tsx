import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { withUniwind } from 'uniwind';
import { HeaderTitle } from "@/components/ui/text";
import DateTimePicker from '@react-native-community/datetimepicker';

const UButton = withUniwind(TouchableOpacity);

export function MonthYearPicker() {
  const [show, setShow] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const onChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    
    if (date) {
      setSelectedDate(date);
    }
  };

  const showDatepicker = () => {
    setShow(true);
  };

  return (
    <>
      <UButton 
        onPress={showDatepicker}
        className="flex-row items-center gap-2"
      >
        <HeaderTitle className="text-2xl text-white">
          {dayjs(selectedDate).format('MMMM YYYY')}
        </HeaderTitle>
        <MaterialCommunityIcons name="chevron-down" size={20} color="white" />
      </UButton>

      {show && (
        <DateTimePicker
          testID="dateTimePicker"
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onChange}
          themeVariant="dark"
          accentColor="#4FA0FF"
        />
      )}
    </>
  );
}
