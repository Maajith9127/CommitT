import React from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';
import { SkeletonBlock } from './SkeletonBlock';

const UView = withUniwind(View);

// Helper to avoid TS lib issues with fill/from
const createArray = (length: number) => {
  const arr = [];
  for (let i = 0; i < length; i++) {
    arr.push(i);
  }
  return arr;
};

export function CalendarShimmer() {
  const ROW_HEIGHT = 80;
  const NUM_DAYS = 4;
  const NUM_HOURS = 8; // Simulate visible screen height

  return (
    <UView className="flex-1 bg-black relative">
       {/* Header Row */}
       <UView className="flex-row items-center pt-5 pb-2 border-b border-[#333]">
          {/* Time Label Header Placeholder */}
          <UView className="w-[15%] items-center justify-center">
            <SkeletonBlock width={40} height={14} borderRadius={4} />
          </UView>

          {/* Day Headers Placeholders */}
          <UView className="flex-1 flex-row">
            {createArray(NUM_DAYS).map((_: number, i: number) => (
              <UView key={i} className="flex-1 items-center justify-center">
                 <SkeletonBlock width={30} height={10} borderRadius={4} className="mb-2" />
                 <SkeletonBlock width={20} height={20} borderRadius={4} />
              </UView>
            ))}
          </UView>
       </UView>

       {/* Grid Body */}
       <UView className="flex-1 flex-row">
          {/* Time Column Placeholders */}
          <UView className="w-[15%] border-r border-[#333]">
             {createArray(NUM_HOURS).map((_: number, i: number) => (
               <UView key={i} style={{ height: ROW_HEIGHT }} className="justify-center items-center border-b border-[#333]">
                  <SkeletonBlock width={30} height={10} borderRadius={4} />
               </UView>
             ))}
          </UView>

          {/* Day Columns */}
          <UView className="flex-1 flex-row relative">
             {createArray(NUM_DAYS).map((_: number, colIndex: number) => (
                <UView key={colIndex} className="flex-1 border-r border-[#333]">
                   {/* Standard Grid Lines */}
                   {createArray(NUM_HOURS).map((_: number, rowIndex: number) => (
                      <UView 
                        key={`grid-${colIndex}-${rowIndex}`} 
                        style={{ height: ROW_HEIGHT }} 
                        className="border-b border-[#333]" 
                      />
                   ))}

                   {/* Fake Skeleton Events to simulate content loading */}
                   {colIndex === 0 && (
                      <UView className="absolute top-[100px] left-1 right-1 h-[140px] overflow-hidden">
                        <SkeletonBlock width="100%" height="100%" borderRadius={8} style={{ backgroundColor: '#1E293B' }} />
                      </UView>
                   )}
                   {colIndex === 1 && (
                      <UView className="absolute top-[20px] left-1 right-1 h-[70px] overflow-hidden">
                         <SkeletonBlock width="100%" height="100%" borderRadius={8} style={{ backgroundColor: '#1E293B' }} />
                      </UView>
                   )}
                   {colIndex === 2 && (
                      <UView className="absolute top-[250px] left-1 right-1 h-[180px] overflow-hidden">
                        <SkeletonBlock width="100%" height="100%" borderRadius={8} style={{ backgroundColor: '#1E293B' }} />
                      </UView>
                   )}
                   {colIndex === 3 && (
                      <>
                        <UView className="absolute top-[50px] left-1 right-1 h-[100px] overflow-hidden">
                            <SkeletonBlock width="100%" height="100%" borderRadius={8} style={{ backgroundColor: '#1E293B' }} />
                        </UView>
                        <UView className="absolute top-[340px] left-1 right-1 h-[80px] overflow-hidden">
                            <SkeletonBlock width="100%" height="100%" borderRadius={8} style={{ backgroundColor: '#1E293B' }} />
                        </UView>
                      </>
                   )}
                </UView>
             ))}
          </UView>
       </UView>
    </UView>
  );
}
