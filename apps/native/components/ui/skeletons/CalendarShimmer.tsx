import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { withUniwind } from 'uniwind';
import { SkeletonBlock } from './SkeletonBlock';

const UView = withUniwind(View);

// Mimics the number of days in the view
const DAYS = 1;
// Mimics full day (0-23)
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Placeholder for fake events
// Placeholder for fake events - simplified for single day view
const FAKE_EVENTS = [
  { day: 0, hour: 1, duration: 2, color: '#4FA0FF', type: 'block' }, // 1 AM - 3 AM
  { day: 0, hour: 4, duration: 1.5, color: '#FF6B6B', type: 'block' }, // 4 AM - 5:30 AM
  { day: 0, hour: 7, duration: 3, color: '#4CD964', type: 'block' }, // 7 AM - 10 AM
];

export function CalendarShimmer() {
  const ROW_HEIGHT = 80; // Matching minTimeIntervalHeight

  return (
    <UView className="flex-1 bg-black relative">
      {/* Header Row (Single Day) */}
      <UView className="flex-row items-center pt-2 pb-2 pl-[60px] border-b border-transparent">
        {/* Aligning with the day column content, usually centered or slightly left */}
        <UView className="flex-1 items-center justify-center">
            {/* Day Name (e.g. Sun) */}
            <SkeletonBlock width={30} height={12} borderRadius={4} className="mb-1" />
            {/* Day Number (e.g. 15) */}
            <SkeletonBlock width={25} height={25} borderRadius={12} />
        </UView>
      </UView>

      {/* Grid Content */}
      <UView className="flex-1 flex-row">
        {/* Time Column */}
        <UView className="w-[60px] bg-black border-r border-transparent">
          {HOURS.map((hour) => (
            <UView key={`hour-${hour}`} style={{ height: ROW_HEIGHT }} className="justify-center items-center border-b-[4px] border-black">
              <SkeletonBlock width={30} height={10} borderRadius={4} />
            </UView>
          ))}
        </UView>

        {/* Day Column (Single) */}
        <UView className="flex-1 flex-row bg-[#1A1A1A]">
           <UView className="flex-1 border-r border-black relative">
             {/* Vertical Grid Lines */}
             {HOURS.map((h, rowIdx) => (
               <UView key={`cell-0-${rowIdx}`} style={{ height: ROW_HEIGHT }} className="border-b-[4px] border-black w-full" />
             ))}

             {/* Fake Events */}
             {FAKE_EVENTS.map((evt, idx) => (
               <UView 
                  key={`fake-evt-${idx}`}
                  style={{
                    position: 'absolute',
                    top: (evt.hour * ROW_HEIGHT) + 2,
                    left: 2,
                    right: 2,
                    height: (evt.duration * ROW_HEIGHT) - 4,
                    backgroundColor: evt.color,
                    opacity: 0.3, 
                    borderRadius: 15,
                    padding: 10
                  }}
               >
                  <SkeletonBlock 
                    width="70%" 
                    height={10} 
                    borderRadius={4} 
                    style={{ backgroundColor: 'rgba(255,255,255,0.4)' }} 
                  />
               </UView>
             ))}
           </UView>
        </UView>
      </UView>
    </UView>
  );
}
