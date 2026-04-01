import React from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';
import { SkeletonBlock } from './SkeletonBlock';

const UView = withUniwind(View);

/**
 * LocationPresetSkeleton
 * ─────────────────────────────────────────────────────────────────────────────
 * Matches the layout of LocationPresetCard in presets.tsx.
 */
export function LocationPresetSkeleton() {
  return (
    <UView className="border-b border-white/10">
      <UView className="px-6 py-5 flex-row items-center">
        {/* Icon */}
        <SkeletonBlock width={28} height={28} borderRadius={14} className="mr-4" />
        
        {/* Text Stack */}
        <UView className="flex-1 mr-4">
          <SkeletonBlock width="70%" height={18} borderRadius={4} />
          <SkeletonBlock width="40%" height={14} borderRadius={4} className="mt-2" />
        </UView>

        {/* Menu Dots */}
        <SkeletonBlock width={24} height={24} borderRadius={12} />
      </UView>

      {/* Map Placeholder */}
      <UView className="w-full" style={{ height: 160 }}>
        <SkeletonBlock width="100%" height="100%" borderRadius={0} />
      </UView>
    </UView>
  );
}

/**
 * DigitalPresetSkeleton
 * ─────────────────────────────────────────────────────────────────────────────
 * Matches the layout of DigitalPresetCard in presets.tsx.
 */
export function DigitalPresetSkeleton() {
  return (
    <UView className="border-b border-white/10 p-6">
      <UView className="flex-row items-center mb-4">
        {/* Icon */}
        <SkeletonBlock width={28} height={28} borderRadius={14} className="mr-4" />
        
        {/* Text Stack */}
        <UView className="flex-1">
          <SkeletonBlock width="60%" height={18} borderRadius={4} />
          <SkeletonBlock width="30%" height={14} borderRadius={4} className="mt-2" />
        </UView>

        {/* Menu Dots */}
        <SkeletonBlock width={24} height={24} borderRadius={12} />
      </UView>

      {/* App Icon Gallery Skeleton */}
      <UView className="pl-11 flex-row">
        {[1, 2, 3, 4].map((i) => (
          <UView key={i} className="mr-4 items-center">
            <SkeletonBlock width={36} height={36} borderRadius={10} />
            <SkeletonBlock width={30} height={10} borderRadius={2} className="mt-2" />
          </UView>
        ))}
      </UView>
    </UView>
  );
}
