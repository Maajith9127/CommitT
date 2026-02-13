import React from 'react';
import { View } from 'react-native';
import { withUniwind } from 'uniwind';
import { SkeletonBlock } from './SkeletonBlock';

const UView = withUniwind(View);

export function CommitCardSkeleton() {
  return (
    <UView className="bg-[#1A1A1A] w-full rounded-3xl border border-transparent px-4 py-5 mb-4">
      {/* ---------------------------------------------------------------- */}
      {/* TOP ROW — 3 COLUMN GRID                                         */}
      {/* ---------------------------------------------------------------- */}
      <UView className="flex-row justify-between">
        {/* LEFT COLUMN — STATUS BADGE */}
        <UView className="w-[25%] items-start pt-1">
          <SkeletonBlock width={70} height={26} borderRadius={13} className="bg-[#2A2A2A]" />
        </UView>

        {/* CENTER COLUMN — ICON + TITLE + CONDITIONS */}
        <UView className="w-[50%] items-center">
          {/* Icon */}
          <SkeletonBlock width={45} height={45} borderRadius={22.5} />
          {/* Title */}
          <SkeletonBlock width={100} height={20} borderRadius={4} className="mt-2" />
          {/* Conditions subtext */}
          <SkeletonBlock width={80} height={12} borderRadius={4} className="mt-1" />
        </UView>

        {/* RIGHT COLUMN — OPTIONS MENU */}
        <UView className="w-[25%] items-end pt-1 pr-1">
          <SkeletonBlock width={26} height={26} borderRadius={13} />
        </UView>
      </UView>

      {/* ---------------------------------------------------------------- */}
      {/* BOTTOM ROW — EXTRA INFO                                         */}
      {/* ---------------------------------------------------------------- */}
      <UView className="mt-4 flex-row justify-center gap-6">
        <SkeletonBlock width={40} height={14} borderRadius={4} />
        <SkeletonBlock width={40} height={14} borderRadius={4} />
      </UView>
    </UView>
  );
}
