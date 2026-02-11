import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { withUniwind } from 'uniwind';
import { SkeletonBlock } from './SkeletonBlock';

const UView = withUniwind(View);

// Mimics the number of days in the view (7 or 3)
const DAYS = 7;
// Mimics a few hours
const HOURS = Array.from({ length: 12 }, (_, i) => i + 6); // 6am - 6pm

// Placeholder for fake events
const FAKE_EVENTS = [
  { day: 1, hour: 0, height: 60, color: '#4FA0FF', type: 'block' },
  { day: 2, hour: 2, height: 90, color: '#FF6B6B', type: 'block' },
  { day: 3, hour: 1, height: 45, color: '#4CD964', type: 'block' },
  { day: 4, hour: 4, height: 120, color: '#FFD93D', type: 'block' },
  { day: 5, hour: 3, height: 60, color: '#6C5CE7', type: 'block' },
  { day: 6, hour: 0, height: 90, color: '#A29BFE', type: 'block' },
];

export function CalendarShimmer() {
  return (
    <UView className="flex-1 bg-black relative">
      {/* Header Row (Days) */}
      <UView className="flex-row items-center pt-2 pb-2 pl-[60px] border-b border-[#333]">
        {Array.from({ length: DAYS }).map((_, i) => (
          <UView key={`day-${i}`} className="flex-1 items-center justify-center">
            {/* Day Name skeleton */}
            <SkeletonBlock width={30} height={12} borderRadius={4} className="mb-1" />
            {/* Day Number skeleton */}
            <SkeletonBlock width={20} height={20} borderRadius={10} />
          </UView>
        ))}
      </UView>

      {/* Grid Content */}
      <UView className="flex-1 flex-row">
        {/* Time Column */}
        <UView className="w-[60px] bg-black border-r border-[#333]">
          {HOURS.map((hour) => (
            <UView key={`hour-${hour}`} className="h-[60px] justify-center items-center border-b border-[#333]">
              <SkeletonBlock width={30} height={10} borderRadius={4} />
            </UView>
          ))}
        </UView>

        {/* Day Columns */}
        <UView className="flex-1 flex-row bg-[#1A1A1A]">
          {Array.from({ length: DAYS }).map((_, colIndex) => (
             <UView key={`col-${colIndex}`} className="flex-1 border-r border-[#333] relative">
               {/* Vertical Grid Lines */}
               {HOURS.map((h, rowIdx) => (
                 <UView key={`cell-${colIndex}-${rowIdx}`} className="h-[60px] border-b border-[#333] w-full" />
               ))}

               {/* Random Fake Events overlays */}
               {FAKE_EVENTS.filter(e => e.day === colIndex).map((evt, idx) => (
                 <SkeletonBlock 
                    key={`fake-evt-${colIndex}-${idx}`}
                    style={{
                      position: 'absolute',
                      top: evt.hour * 60 + 10,
                      left: 2,
                      right: 2,
                      height: evt.height,
                      backgroundColor: evt.color, // Use varied colors for realistic feel
                      opacity: 0.2, // Make it subtle
                      borderRadius: 6
                    }}
                 />
               ))}
             </UView>
          ))}
        </UView>
      </UView>
    </UView>
  );
}
