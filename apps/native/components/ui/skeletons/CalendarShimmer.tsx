import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { withUniwind } from 'uniwind';
import { SkeletonBlock } from './SkeletonBlock';

const UView = withUniwind(View);

// Mimics the number of days in the view
const DAYS = 7;
// Mimics full day (0-23)
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Placeholder for fake events
const FAKE_EVENTS = [
  { day: 0, hour: 1, duration: 2, color: '#4FA0FF', type: 'block' }, // Blue (Content creation)
  { day: 0, hour: 4, duration: 1.5, color: '#FF6B6B', type: 'block' }, // Red (Gym)
  { day: 0, hour: 7, duration: 3, color: '#4CD964', type: 'block' }, // Green (Library)
  { day: 1, hour: 2, duration: 1, color: '#FFD93D', type: 'block' },
  { day: 2, hour: 5, duration: 2, color: '#A29BFE', type: 'block' },
  { day: 3, hour: 0, duration: 1.5, color: '#FF7675', type: 'block' },
];

export function CalendarShimmer() {
  const ROW_HEIGHT = 80; // Matching minTimeIntervalHeight

  return (
    <UView className="flex-1 bg-black relative">
      {/* Header Row (Days) */}
      <UView className="flex-row items-center pt-2 pb-2 pl-[60px] border-b border-transparent">
        {Array.from({ length: 7 }).map((_, i) => (
          <UView key={`day-${i}`} className="flex-1 items-center justify-center">
            <SkeletonBlock width={30} height={12} borderRadius={4} className="mb-1" />
            <SkeletonBlock width={20} height={20} borderRadius={10} />
          </UView>
        ))}
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

        {/* Day Columns */}
        <UView className="flex-1 flex-row bg-[#1A1A1A]">
          {Array.from({ length: 7 }).map((_, colIndex) => (
             <UView key={`col-${colIndex}`} className="flex-1 border-r border-[#333] relative">
               {/* Vertical Grid Lines */}
               {HOURS.map((h, rowIdx) => (
                 <UView key={`cell-${colIndex}-${rowIdx}`} style={{ height: ROW_HEIGHT }} className="border-b-[4px] border-black w-full" />
               ))}

               {/* Fake Events */}
               {FAKE_EVENTS.filter(e => e.day === colIndex).map((evt, idx) => (
                 <UView 
                    key={`fake-evt-${colIndex}-${idx}`}
                    style={{
                      position: 'absolute',
                      top: (evt.hour * ROW_HEIGHT) + 2, // slightly offset within the grid relative to loop start
                      left: 2,
                      right: 2,
                      height: (evt.duration * ROW_HEIGHT) - 4, // subtract spacing
                      backgroundColor: evt.color,
                      opacity: 0.3, 
                      borderRadius: 7, // Rounded corners matching config
                      padding: 8
                    }}
                 >
                    {/* Inner Text Skeleton */}
                    <SkeletonBlock 
                      width="70%" 
                      height={10} 
                      borderRadius={4} 
                      style={{ backgroundColor: 'rgba(255,255,255,0.4)' }} 
                    />
                 </UView>
               ))}
             </UView>
          ))}
        </UView>
      </UView>
    </UView>
  );
}
