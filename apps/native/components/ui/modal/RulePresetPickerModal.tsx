/**
 * RulePresetPickerModal
 * ─────────────────────────────────────────────────────────────────────────────
 * A high-fidelity, reusable modal for selecting behavioral rule presets.
 * Uses the 3-tiered manifest UI for consistent visual language across the app.
 */

import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from "@commit/backend/convex/_generated/api";

import { BaseDrawerModal } from './BaseDrawerModal';
import { HeaderTitle, BodyText } from '@/components/ui/text';
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';

// ── Uniwind primitives ──────────────────────────────────────────────────────
const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UPressable = withUniwind(Pressable);

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

export interface RulePresetPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (preset: any | null) => void;
  selectedId?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODAL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function RulePresetPickerModal({
  visible,
  onClose,
  onSelect,
  selectedId,
}: RulePresetPickerModalProps) {
  const rules = useQuery(api.api.commitments.presets.getRecommendedRules, { limit: 12 });
  const isLoading = rules === undefined;
  const isEmpty = rules !== undefined && rules.length === 0;

  function handleSelect(preset: any) {
    if (selectedId === preset._id) {
      onSelect(null);
    } else {
      onSelect(preset);
    }
  }

  return (
    <BaseDrawerModal visible={visible} onClose={onClose} height="78%">
      {/* ── Header ── */}
      <UView className="px-6 py-6 pt-8 border-b border-white/10">
        <UView className="flex-row items-center justify-between">
          <UView className="flex-row items-center gap-3">
            <MaterialCommunityIcons name="format-list-checks" size={28} color="#9CA3AF" />
            <HeaderTitle className="text-2xl">Behavioral Rules</HeaderTitle>
          </UView>
          <UPressable onPress={onClose} hitSlop={10}>
            <MaterialCommunityIcons name="close" size={24} color="white" />
          </UPressable>
        </UView>
        <BodyText className="text-gray-400 mt-2 ml-1">
          Select a behavioral rule to bin to this time slot
        </BodyText>
      </UView>

      {/* ── Scrollable Preset List (3-Tiered UI) ── */}
      <UScroll
        className="flex-1 bg-black"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <UView className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#9CA3AF" />
            <BodyText className="text-gray-500 mt-4">Syncing rule manifest...</BodyText>
          </UView>
        )}

        {isEmpty && (
          <UView className="py-20 items-center justify-center px-8">
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#333" />
            <BodyText className="text-gray-500 mt-4 text-center">
              No rule presets found. Save a rule in the Presets hub to see it here.
            </BodyText>
          </UView>
        )}

        {rules?.map((preset: any) => (
          <RuleSelectionCard
            key={preset._id}
            preset={preset}
            isSelected={selectedId === preset._id}
            onSelect={() => handleSelect(preset)}
          />
        ))}
      </UScroll>
    </BaseDrawerModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: RuleSelectionCard (Mirrors presets.tsx exactly)
// ─────────────────────────────────────────────────────────────────────────────

function RuleSelectionCard({
  preset,
  isSelected,
  onSelect,
}: {
  preset: any;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isStay = preset.config?.verification_style === "stay_throughout";
  
  return (
    <UPressable 
      onPress={onSelect}
      className={`border-b border-white/5 bg-[#1A1A1A]/30 p-6 ${isSelected ? 'bg-white/5' : ''}`}
    >
      <UView className="flex-row items-center mb-1">
        <MaterialCommunityIcons
          name="format-list-checks"
          size={24}
          color={isSelected ? "#4FA0FF" : "#6B7280"}
          style={{ marginRight: 16 }}
        />
        <UView className="flex-1 mr-4 overflow-hidden">
          <HeaderTitle className={`text-base ${isSelected ? 'text-[#4FA0FF]' : 'text-white'}`} numberOfLines={1}>
            {preset.title || preset.name}
          </HeaderTitle>
          <BodyText className="text-gray-500 text-xs mt-0.5">
            {isStay ? "Continuous Guard" : "Arrival Check"}
          </BodyText>
        </UView>

        <VerificationStatusCircle
          status={isSelected ? "verified" : "dots"}
          onPress={onSelect}
        />
      </UView>

      {/* ── Rule DNA Subheaded Manifest (The 3-Tiered logic) ── */}
      <UView className="pl-10 mt-3 space-y-4">
        
        {/* Module 1: Type */}
        <UView>
          <BodyText className="text-gray-500 text-[8px] font-bold uppercase tracking-widest mb-1.5">Type</BodyText>
          <UView className="flex-row flex-wrap gap-2">
            <UView className="px-3 py-1 rounded-full border border-white/10 bg-white/5">
              <BodyText className="text-gray-400 text-[9px] font-bold uppercase">
                {isStay ? "Stay Throughout" : "Just Show Up"}
              </BodyText>
            </UView>
            {isStay && (
              <UView className="px-3 py-1 rounded-full border border-white/10 bg-white/5">
                <BodyText className="text-gray-400 text-[9px] font-bold uppercase">
                  Max Miss: {preset.max_missed_checkins || 3}
                </BodyText>
              </UView>
            )}
          </UView>
        </UView>

        {/* Module 2: Alarms */}
        <UView>
          <BodyText className="text-gray-500 text-[8px] font-bold uppercase tracking-widest mb-1.5">Alarms</BodyText>
          <UView className="flex-row flex-wrap gap-2">
            <UView className="px-3 py-1 rounded-full border border-white/10 bg-white/5">
              <BodyText className="text-gray-400 text-[9px] font-bold uppercase">
                {preset.config?.alarms?.lead_time_minutes || 0} mins before
              </BodyText>
            </UView>
            {(preset.config?.alarms?.interval_minutes || 0) > 0 && (
              <UView className="px-3 py-1 rounded-full border border-white/10 bg-white/5">
                <BodyText className="text-gray-400 text-[9px] font-bold uppercase">
                  every {preset.config.alarms.interval_minutes} mins
                </BodyText>
              </UView>
            )}
          </UView>
        </UView>

        {/* Module 3: Penalty Waiver */}
        <UView>
          <BodyText className="text-gray-500 text-[8px] font-bold uppercase tracking-widest mb-1.5">Penalty Waiver</BodyText>
          <UView className="flex-row flex-wrap gap-2">
            <UView className="px-3 py-1 rounded-full border border-white/10 bg-white/5">
              <BodyText className="text-gray-400 text-[9px] font-bold uppercase">
                {preset.penalty_waiver?.deadline_hours || (preset.penalty_waiver?.deadline_minutes ? Math.floor(preset.penalty_waiver.deadline_minutes / 60) : 0)} HRS
              </BodyText>
            </UView>
            {preset.penalty_waiver?.allow_early !== false && (
              <UView className="px-3 py-1 rounded-full border border-white/10 bg-white/5">
                <BodyText className="text-gray-400 text-[9px] font-bold uppercase">
                  pre waiver allowed
                </BodyText>
              </UView>
            )}
          </UView>
        </UView>

      </UView>
    </UPressable>
  );
}
