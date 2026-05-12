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
import { useRouter } from 'expo-router';
import { api } from '@commit/backend/convex/_generated/api';

import { BaseDrawerModal } from './BaseDrawerModal';
import { ConfirmationModal } from './ConfirmationModal';
import { HeaderTitle, BodyText } from '@/components/ui/text';
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';
import { ActionMenu } from '@/components/ui/commits/ActionMenu';
import { THEME } from '@/constants/theme';

// ── Uniwind primitives ──────────────────────────────────────────────────────
const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UPressable = withUniwind(Pressable);

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
  const router = useRouter();
  const rulePresets = useQuery(api.api.commitments.presets.getRecommendedRules, { limit: 20 });
  const [activePreset, setActivePreset] = React.useState<any>(null);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  /**
   * Selection Orchestration:
   * Toggling selection state directly without auto-closing the modal.
   * This allows users to review their choice or pivot to a different rule
   * without the friction of reopening the drawer.
   */
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
      <UView className="px-6 py-6 pt-8 border-b" style={{ borderColor: THEME.colors.surfaceElevated }}>
        <UView className="flex-row items-center justify-between">
          <UView className="flex-row items-center gap-3">
            <MaterialCommunityIcons name="format-list-checks" size={28} color={THEME.colors.textMuted} />
            <HeaderTitle className="text-2xl" style={{ color: THEME.colors.textMain }}>Behavioral Rules</HeaderTitle>
          </UView>
          <UPressable onPress={onClose} hitSlop={10}>
            <MaterialCommunityIcons name="close" size={24} color={THEME.colors.textMain} />
          </UPressable>
        </UView>
        <BodyText className="mt-2 ml-1" style={{ color: THEME.colors.textMuted }}>
          Select a behavioral rule to bind to this time slot
        </BodyText>
      </UView>

      {/* ── Content Container (Rule DNA List) ── */}
      <UScroll
        className="flex-1"
        style={{ backgroundColor: THEME.colors.surface }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {rulePresets === undefined && (
          <UView className="p-10 items-center justify-center">
             <BodyText style={{ color: THEME.colors.textMuted }}>Loading Presets...</BodyText>
          </UView>
        )}

        {rulePresets !== undefined && rulePresets.length === 0 && (
          <UView className="p-10 items-center justify-center">
             <BodyText style={{ color: THEME.colors.textMuted }}>No behavioral rules saved yet.</BodyText>
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
            icon: activePreset?._id === selectedId ? "close-circle-outline" : "check-circle-outline",
            label: activePreset?._id === selectedId ? "Deselect" : "Select",
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
              if (activePreset && activePreset.config) {
                const config = activePreset.config;
                const stayConfig = config.stay_throughout_config;
                
                router.push({ 
                  pathname: "/(edit-preset)/edit-rule-preset", 
                  params: { 
                    presetId: activePreset._id,
                    name: activePreset.title || activePreset.name || "Edit Rule",
                    style: config.verification_style,
                    intensity: stayConfig?.intensity || "moderate",
                    grace: config.grace_period_minutes?.toString() || "5",
                    lead: config.alarms?.lead_time_minutes?.toString() || "10",
                    interval: config.alarms?.interval_minutes?.toString() || "0",
                    maxMissed: stayConfig?.max_missed_checkins?.toString() ?? "1",
                  } 
                });
              }
            },
          },
          {
            icon: "delete-outline",
            label: "Delete",
            color: THEME.colors.danger,
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
        confirmColor={THEME.colors.danger}
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
      onPress={(e: any) => {
        /**
         * PRODUCTION RATIONALE: "Menu-First Interaction"
         * Tapping an UNSELECTED card opens the Action Menu for deliberation.
         * Tapping a SELECTED card immediately toggles it off.
         * This prevents 'accidental selection' and keeps the interaction 
         * lifecycle explicitly in the user's control.
         */
        if (isSelected) {
          onSelect();
        } else {
          onMorePress(e.nativeEvent.pageX, e.nativeEvent.pageY);
        }
      }}
      className="border-b p-6"
      style={{ borderColor: THEME.colors.surfaceElevated }}
    >
      <UView className="flex-row items-center mb-4">
        <MaterialCommunityIcons
          name="format-list-checks"
          size={28}
          color={isSelected ? THEME.colors.primary : THEME.colors.textMuted}
          style={{ marginRight: 16 }}
        />
        <UView className="flex-1 mr-4 overflow-hidden">
          <BodyText className="font-medium" style={{ color: THEME.colors.textMain, fontSize: THEME.typography.size.base }} numberOfLines={1}>
            {preset.title || preset.name}
          </BodyText>
          <BodyText className="mt-1" style={{ color: THEME.colors.textMuted, fontSize: THEME.typography.size.sm }}>
            {isStay ? "Continuous Guard" : "Arrival Check"} · Used {preset.usage_count || 0}x
          </BodyText>
        </UView>
        
        <VerificationStatusCircle
          status={isSelected ? "verified" : "dots"}
        />
      </UView>

      {/* ── Rule DNA Subheaded Manifest (Aligned to pl-11) ── */}
      <UView className="pl-11 mt-1">
        
        {/* Module 1: Type */}
        <UView className="mb-6">
          <BodyText className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: THEME.colors.textMuted }}>Type</BodyText>
          <UView className="flex-row flex-wrap gap-2">
            <UView className="px-4 py-1.5 rounded-full border" style={{ borderColor: THEME.colors.surfaceElevated, backgroundColor: THEME.colors.surfaceLight }}>
              <BodyText className="text-[12px] font-bold uppercase" style={{ color: THEME.colors.textMain }}>
                {isStay ? "Stay Throughout" : "Just Show Up"}
              </BodyText>
            </UView>
            {isStay && (
              <UView className="px-4 py-1.5 rounded-full border" style={{ borderColor: THEME.colors.surfaceElevated, backgroundColor: THEME.colors.surfaceLight }}>
                <BodyText className="text-[12px] font-bold uppercase" style={{ color: THEME.colors.textMain }}>
                  Max Miss: {preset.config?.stay_throughout_config?.max_missed_checkins || 3}
                </BodyText>
              </UView>
            )}
            {isStay && (
              <UView className="px-4 py-1.5 rounded-full border" style={{ borderColor: THEME.colors.surfaceElevated, backgroundColor: THEME.colors.surfaceLight }}>
                <BodyText className="text-[12px] font-bold uppercase" style={{ color: THEME.colors.textMain }}>
                  {preset.config?.stay_throughout_config?.intensity || "Moderate"}
                </BodyText>
              </UView>
            )}
            {!isStay && (
              <UView className="px-4 py-1.5 rounded-full border" style={{ borderColor: THEME.colors.surfaceElevated, backgroundColor: THEME.colors.surfaceLight }}>
                <BodyText className="text-[12px] font-bold uppercase" style={{ color: THEME.colors.textMain }}>
                  {preset.config?.grace_period_minutes || 0}m Grace
                </BodyText>
              </UView>
            )}
          </UView>
        </UView>

        {/* Module 2: Alarms */}
        <UView className="mb-6">
          <BodyText className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: THEME.colors.textMuted }}>Alarms</BodyText>
          <UView className="flex-row flex-wrap gap-2">
            <UView className="px-4 py-1.5 rounded-full border" style={{ borderColor: THEME.colors.surfaceElevated, backgroundColor: THEME.colors.surfaceLight }}>
              <BodyText className="text-[12px] font-bold uppercase" style={{ color: THEME.colors.textMain }}>
                {preset.config?.alarms?.lead_time_minutes || 0} mins before
              </BodyText>
            </UView>
            {preset.config?.alarms?.interval_minutes > 0 && (
              <UView className="px-4 py-1.5 rounded-full border" style={{ borderColor: THEME.colors.surfaceElevated, backgroundColor: THEME.colors.surfaceLight }}>
                <BodyText className="text-[12px] font-bold uppercase" style={{ color: THEME.colors.textMain }}>
                  every {preset.config.alarms.interval_minutes} mins
                </BodyText>
              </UView>
            )}
          </UView>
        </UView>
      </UView>
    </UPressable>
  );
}
