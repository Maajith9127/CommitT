import React from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';
import { SkeletonBlock } from './SkeletonBlock';

const UView = withUniwind(View);

/**
 * ConditionCardSkeleton
 * ─────────────────────────────────────────────────────────────────────────────
 * A shimmer loader that mirrors the structure of the ConditionCard component.
 * Used for maintaining visual continuity during data hydration.
 */
export function ConditionCardSkeleton() {
  return (
    <UView 
      className="mb-4 flex-row items-center rounded-3xl bg-[#1A1A1A] px-4 py-6"
      style={{ 
        borderWidth: 3, 
        borderColor: "#4FA0FF",
        overflow: "visible"
      }}
    >
      {/* 1. ICON SKELETON */}
      <SkeletonBlock 
        width={30} 
        height={30} 
        borderRadius={15} 
        className="bg-[#2A2A2A]"
        style={{ marginRight: 12 }}
      />

      {/* 2. TEXT STACK SKELETON */}
      <UView className="flex-1">
        {/* Title */}
        <SkeletonBlock 
          width="60%" 
          height={20} 
          borderRadius={4} 
          className="bg-[#2A2A2A]"
        />

        {/* Subtitle */}
        <SkeletonBlock 
          width="40%" 
          height={14} 
          borderRadius={4} 
          className="mt-2 bg-[#2A2A2A]"
        />
      </UView>

      {/* 3. ARROW SKELETON (Optional but consistent) */}
      <SkeletonBlock 
        width={24} 
        height={24} 
        borderRadius={12} 
        className="bg-[#2A2A2A]"
      />
    </UView>
  );
}
