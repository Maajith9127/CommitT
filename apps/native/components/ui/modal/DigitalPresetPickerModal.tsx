/**
 * DigitalPresetPickerModal
 * ─────────────────────────────────────────────────────────────────────────────
 * A production-ready, reusable modal for selecting saved app-blocklist presets.
 *
 * DATA SOURCE:
 *   Reads EXCLUSIVELY from the PresetStore (Zustand). Zero network requests.
 *
 * SELECTION BEHAVIOR:
 *   - The currently selected preset shows a green ✓ check circle (verified state)
 *   - All other presets show a neutral pointer circle (tappable)
 *   - Tapping a selected preset deselects it (toggle behavior)
 */

import React, { useMemo } from 'react';
import { View, ScrollView, Image, Pressable, ActivityIndicator, Text } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { BaseDrawerModal } from './BaseDrawerModal';
import { HeaderTitle, BodyText } from '@/components/ui/text';
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';
import { usePresetStore, type DigitalPreset } from '@/stores/usePresetStore';
import { useAppStore } from '@/stores/useAppStore';

// ── Uniwind primitives ──────────────────────────────────────────────────────
const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UPressable = withUniwind(Pressable);

// ── Props ───────────────────────────────────────────────────────────────────

export interface DigitalPresetPickerModalProps {
  /** Controls visibility of the modal */
  visible: boolean;
  /** Callback when the modal is dismissed */
  onClose: () => void;
  /** Callback when a digital commitment preset is selected (or null if deselected) */
  onSelect: (preset: DigitalPreset | null) => void;
  /** ID of the currently selected digital commitment preset (for ✓ indicator) */
  selectedId?: string | null;
}

// ── Component ───────────────────────────────────────────────────────────────

export function DigitalPresetPickerModal({
  visible,
  onClose,
  onSelect,
  selectedId,
}: DigitalPresetPickerModalProps) {
  // ── Data Layer: Read directly from the pre-hydrated store ──
  const digitalCommitments = usePresetStore((s: { digitalCommitments: DigitalPreset[] }) => s.digitalCommitments);
  const hydrationStatus = usePresetStore((s: { hydrationStatus: string }) => s.hydrationStatus);

  const isLoading = hydrationStatus === "loading";
  const isEmpty = hydrationStatus === "ready" && digitalCommitments.length === 0;

  /**
   * handleSelect — Toggle-aware selection handler.
   * If the user taps the already-selected preset, it deselects it.
   */
  function handleSelect(preset: DigitalPreset) {
    if (selectedId === preset._id) {
      onSelect(null);
    } else {
      onSelect(preset);
    }
  }

  return (
    <BaseDrawerModal
      visible={visible}
      onClose={onClose}
      height="90%"
    >
      {/* ── Header ── */}
      <UView className="px-6 py-6 pt-8 border-b border-white/10">
        <UView className="flex-row items-center justify-between">
          <UView className="flex-row items-center gap-3">
            <MaterialCommunityIcons name="cellphone-lock" size={28} color="#C084FC" />
            <HeaderTitle className="text-2xl">App Blocklists</HeaderTitle>
          </UView>
          <UPressable onPress={onClose} hitSlop={10}>
            <MaterialCommunityIcons name="close" size={24} color="white" />
          </UPressable>
        </UView>
        <BodyText className="text-gray-400 mt-2 ml-1">
          Select an app blocklist to attach to this time slot
        </BodyText>
      </UView>

      {/* ── Scrollable Preset List ── */}
      <UScroll
        className="flex-1 bg-[#1A1A1A]"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {isLoading && (
          <UView className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#C084FC" />
            <BodyText className="text-gray-500 mt-4">Loading your blocklists...</BodyText>
          </UView>
        )}

        {/* Empty State */}
        {isEmpty && (
          <UView className="py-20 items-center justify-center px-8">
            <MaterialCommunityIcons name="shield-off-outline" size={48} color="#333" />
            <BodyText className="text-gray-500 mt-4 text-center">
              No saved blocklists yet. Create a commitment with app blocking to see it here.
            </BodyText>
          </UView>
        )}

        {/* Preset Cards */}
        {digitalCommitments.map((preset: DigitalPreset) => (
          <DigitalPresetCard
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
// SUB-COMPONENT: DigitalPresetCard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DigitalPresetCard
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a single digital commitment preset with:
 *   • Header row with preset name + usage metadata
 *   • VerificationStatusCircle (✓ if selected, pointer if not)
 *   • Horizontal app icon gallery
 */
function DigitalPresetCard({
  preset,
  isSelected,
  onSelect,
}: {
  preset: DigitalPreset;
  isSelected: boolean;
  onSelect: () => void;
}) {
  // ── Resolve app metadata from the global device catalog ──
  const discoveredApps = useAppStore((s: { apps: any[] }) => s.apps);

  const resolvedApps = useMemo(() => {
    return preset.apps.map((id: string) => {
      const match = discoveredApps.find((a: any) => a.id === id);
      return {
        id,
        name: match?.name || id.split('.').pop() || id,
        icon: match?.iconUri,
      };
    });
  }, [preset.apps, discoveredApps]);

  const displayName = preset.name || `${preset.apps.length} Apps Blocked`;

  return (
    <UView
      className="border-b border-white/10 p-6"
    >
      {/* ── Header Row ── */}
      <UView className="flex-row items-center mb-4">
        <MaterialCommunityIcons
          name="cellphone-lock"
          size={28}
          color="#9CA3AF"
          style={{ marginRight: 16 }}
        />
        <UView className="flex-1">
          <BodyText className="text-white text-base">{displayName}</BodyText>
          <BodyText className="text-gray-400 text-sm mt-1">
            Used {preset.usage_count}x
          </BodyText>
        </UView>

        {/* ── Selection Indicator (ONLY this is interactive now) ── */}
        <VerificationStatusCircle
          status={isSelected ? "verified" : "neutral"}
          onPress={onSelect}
        />
      </UView>

      {/* ── App Icon Gallery ── */}
      <UView className="pl-11">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', alignItems: 'center' }}
        >
          {resolvedApps.map((app: { id: string; name: string; icon: string | null | undefined }) => (
            <UView key={app.id} className="mr-4 items-center">
              {app.icon ? (
                <Image
                  source={{ uri: app.icon }}
                  style={{ width: 36, height: 36, borderRadius: 10 }}
                />
              ) : (
                <UView
                  className="items-center justify-center bg-[#2A2A2A] rounded-xl"
                  style={{ width: 36, height: 36 }}
                >
                  <MaterialCommunityIcons name="apps" size={20} color="#666" />
                </UView>
              )}
              <Text style={{ color: '#6B7280', fontSize: 10, marginTop: 4 }} numberOfLines={1}>
                {app.name}
              </Text>
            </UView>
          ))}
        </ScrollView>
      </UView>
    </UView>
  );
}
