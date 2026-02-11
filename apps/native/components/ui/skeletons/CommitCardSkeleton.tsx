import React from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';
import { SkeletonBlock } from './SkeletonBlock';

const UView = withUniwind(View);

export function CommitCardSkeleton() {
  return (
    <UView className="bg-[#1A1A1A] p-4 rounded-xl mb-4">
      {/* Title */}
      <SkeletonBlock width={120} height={20} borderRadius={4} className="mb-2" />
      
      {/* Time */}
      <SkeletonBlock width={80} height={14} borderRadius={4} className="mb-4" />
      
      {/* Action Row */}
      <UView className="flex-row justify-between items-center">
        <SkeletonBlock width={100} height={36} borderRadius={18} />
        <SkeletonBlock width={100} height={36} borderRadius={18} />
      </UView>
    </UView>
  );
}
