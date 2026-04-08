/**
 * RulePresetPickerModal
 * ─────────────────────────────────────────────────────────────────────────────
 * A container for selecting behavioral rule presets for specific time slots.
 * Features a high-fidelity 'Rule DNA' manifest UI.
 */

import React from 'react';
import { View, ScrollView, Pressable, Text } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@commit/backend/convex/_generated/api';

import { BaseDrawerModal } from './BaseDrawerModal';
import { ConfirmationModal } from './ConfirmationModal';
import { HeaderTitle, BodyText } from '@/components/ui/text';
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';
import { ActionMenu } from '@/components/ui/commits/ActionMenu';

// ── Uniwind primitives ──────────────────────────────────────────────────────
const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UPressable = withUniwind(Pressable);

const COLORS = {
  primary: "#4FA0FF",
  danger: "#FF3B30",
  textSecondary: "#9CA3AF",
};

export interface RulePresetPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (preset: any) => void;
  selectedId?: string | null;
}

export function RulePresetPickerModal({
  visible,
  onClose,
  onSelect,
  selectedId,
}: RulePresetPickerModalProps) {
  const rulePresets = useQuery(api.api.commitments.presets.getRecommendedRules, { limit: 20 });
  const [activePreset, setActivePreset] = React.useState<any>(null);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  function handleSelect(preset: any) {
    if (selectedId === preset._id) {
      onSelect(null);
    } else {
      onSelect(preset);
    }
  }

  function handleMorePress(preset: any, x: number, y: number) {
    setActivePreset(preset);
    setMenuPosition({ x, y });
    setMenuVisible(true);
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
          Select a behavioral rule to bind to this time slot
        </BodyText>
      </UView>

      {/* ── Content Container (Rule DNA List) ── */}
      <UScroll
        className="flex-1 bg-[#1A1A1A]"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {rulePresets === undefined && (
          <UView className="p-10 items-center justify-center">
             <BodyText className="text-gray-500">Loading Presets...</BodyText>
          </UView>
        )}

        {rulePresets !== undefined && rulePresets.length === 0 && (
          <UView className="p-10 items-center justify-center">
             <BodyText className="text-gray-500">No behavioral rules saved yet.</BodyText>
          </UView>
        )}

        {rulePresets?.map((preset) => (
          <RulePresetCard
            key={preset._id}
            preset={preset}
            isSelected={selectedId === preset._id}
            onSelect={() => handleSelect(preset)}
            onMorePress={(x, y) => handleMorePress(preset, x, y)}
          />
        ))}
      </UScroll>

      <ActionMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        anchorPosition={menuPosition}
        items={[
          {
            icon: "check-circle-outline",
            label: "Select",
            onPress: () => {
              if (activePreset) {
                handleSelect(activePreset);
                setMenuVisible(false);
              }
            },
          },
          {
            icon: "pencil-outline",
            label: "Edit",
            onPress: () => {
              setMenuVisible(false);
              // Navigation to edit handled soon
            },
          },
          {
            icon: "delete-outline",
            label: "Delete",
            color: COLORS.danger,
            onPress: () => {
              setMenuVisible(false);
              setShowDeleteConfirm(true);
            },
          },
        ]}
      />

      <ConfirmationModal
        visible={showDeleteConfirm}
        title="Delete this rule preset?"
        confirmText="Delete"
        confirmColor={COLORS.danger}
        isLoading={isDeleting}
        onConfirm={async () => {
          setIsDeleting(true);
          // Mutation handled soon
          setTimeout(() => {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
          }, 800);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </BaseDrawerModal>
  );
}

/**
 * RulePresetCard
 * 
 * Renders a configuration preset (Stay/Arrive logic + Alarm rhythm + Grace Period).
 * Matches the unified 'All-in-One' container layout.
 */
function RulePresetCard({
  preset,
  isSelected,
  onSelect,
  onMorePress,
}: {
  preset: any;
  isSelected: boolean;
  onSelect: () => void;
  onMorePress: (x: number, y: number) => void;
  key?: string | number;
}) {
  const isStay = preset.config?.verification_style === "stay_throughout";
  
  return (
    <UPressable 
      onPress={onSelect}
      className={`border-b border-white/10 p-6 ${isSelected ? 'bg-white/5' : ''}`}
    >
      <UView className="flex-row items-center mb-4">
        <MaterialCommunityIcons
          name="format-list-checks"
          size={28}
          color={isSelected ? COLORS.primary : COLORS.textSecondary}
          style={{ marginRight: 16 }}
        />
        <UView className="flex-1 mr-4 overflow-hidden">
          <BodyText className="text-white text-base font-medium" numberOfLines={1}>
            {preset.title || preset.name}
          </BodyText>
          <BodyText className="text-gray-400 text-sm mt-1">
            {isStay ? "Continuous Guard" : "Arrival Check"} · Used {preset.usage_count || 0}x
          </BodyText>
        </UView>

        <UView 
          className="relative"
          onTouchStart={(e: any) => {
            if (!isSelected) {
              onMorePress(e.nativeEvent.pageX, e.nativeEvent.pageY);
            }
          }}
        >
          <VerificationStatusCircle
            status={isSelected ? "verified" : "dots"}
            onPress={isSelected ? onSelect : undefined}
          />
        </UView>
      </UView>

      {/* ── Rule DNA Subheaded Manifest (Aligned to pl-11) ── */}
      <UView className="pl-11 mt-1">
        
        {/* Module 1: Type */}
        <UView className="mb-6">
          <BodyText className="text-gray-500 text-[11px] font-bold uppercase tracking-widest mb-2">Type</BodyText>
          <UView className="flex-row flex-wrap gap-2">
            <UView className="px-4 py-1.5 rounded-full border border-white/20 bg-white/5">
              <BodyText className="text-gray-300 text-[12px] font-bold uppercase">
                {isStay ? "Stay Throughout" : "Just Show Up"}
              </BodyText>
            </UView>
            {isStay && (
              <UView className="px-4 py-1.5 rounded-full border border-white/20 bg-white/5">
                <BodyText className="text-gray-300 text-[12px] font-bold uppercase">
                  Max Miss: {preset.max_missed_checkins || 3}
                </BodyText>
              </UView>
            )}
            {isStay && (
              <UView className="px-4 py-1.5 rounded-full border border-white/20 bg-white/5">
                <BodyText className="text-gray-300 text-[12px] font-bold uppercase">
                  {preset.intensity || "Moderate"}
                </BodyText>
              </UView>
            )}
            <UView className="px-4 py-1.5 rounded-full border border-white/20 bg-white/5">
              <BodyText className="text-gray-300 text-[12px] font-bold uppercase">
                {preset.config?.grace_period_minutes || 0}m Grace
              </BodyText>
            </UView>
          </UView>
        </UView>

        {/* Module 2: Alarms */}
        <UView className="mb-6">
          <BodyText className="text-gray-500 text-[11px] font-bold uppercase tracking-widest mb-2">Alarms</BodyText>
          <UView className="flex-row flex-wrap gap-2">
            <UView className="px-4 py-1.5 rounded-full border border-white/20 bg-white/5">
              <BodyText className="text-gray-300 text-[12px] font-bold uppercase">
                {preset.config?.alarms?.lead_time_minutes || 0} mins before
              </BodyText>
            </UView>
            {preset.config?.alarms?.interval_minutes > 0 && (
              <UView className="px-4 py-1.5 rounded-full border border-white/20 bg-white/5">
                <BodyText className="text-gray-300 text-[12px] font-bold uppercase">
                  every {preset.config.alarms.interval_minutes} mins
                </BodyText>
              </UView>
            )}
          </UView>
        </UView>

        {/* Module 3: Penalty Waiver */}
        <UView className="mb-2">
          <BodyText className="text-gray-500 text-[11px] font-bold uppercase tracking-widest mb-2">Penalty Waiver</BodyText>
          <UView className="flex-row flex-wrap gap-2">
            <UView className="px-4 py-1.5 rounded-full border border-white/20 bg-white/5">
              <BodyText className="text-gray-300 text-[12px] font-bold uppercase">
                {preset.penalty_waiver?.deadline_hours || (preset.penalty_waiver?.deadline_minutes ? Math.floor(preset.penalty_waiver.deadline_minutes / 60) : 0)} HRS
              </BodyText>
            </UView>
            {preset.penalty_waiver?.allow_early !== false && (
              <UView className="px-4 py-1.5 rounded-full border border-white/20 bg-white/5">
                <BodyText className="text-gray-300 text-[12px] font-bold uppercase">
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
