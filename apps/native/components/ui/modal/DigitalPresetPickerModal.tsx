/**
 * DigitalPresetPickerModal
 * ─────────────────────────────────────────────────────────────────────────────
 * A production-ready, reusable modal for selecting saved app-blocklist presets.
 */

import React, { useMemo, useState } from 'react';
import { View, ScrollView, Image, Pressable, ActivityIndicator, Text } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from "@commit/backend/convex/_generated/api";

import { BaseDrawerModal } from './BaseDrawerModal';
import { ConfirmationModal } from './ConfirmationModal';
import { HeaderTitle, BodyText } from '@/components/ui/text';
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';
import { ActionMenu } from '@/components/ui/commits/ActionMenu';
import { type DigitalPreset } from '@/stores/usePresetStore';
import { useAppStore } from '@/stores/useAppStore';

// ── Uniwind primitives ──────────────────────────────────────────────────────
const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UPressable = withUniwind(Pressable);

// ── Props ───────────────────────────────────────────────────────────────────

export interface DigitalPresetPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (preset: DigitalPreset | null) => void;
  selectedId?: string | null;
}

export function DigitalPresetPickerModal({
  visible,
  onClose,
  onSelect,
  selectedId,
}: DigitalPresetPickerModalProps) {
  const digitalCommitments = useQuery(api.api.commitments.presets.getRecommendedDigitalCommitments, { limit: 12 });

  // ── UI Logic: Context Menu State ──
  const [activePreset, setActivePreset] = useState<DigitalPreset | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // ── Deletion Flow State ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const deletePreset = useMutation(api.api.commitments.presets.deleteDigitalPreset);

  const isLoading = digitalCommitments === undefined;
  const isEmpty = digitalCommitments !== undefined && digitalCommitments.length === 0;

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
      height="78%"
    >
      {/* ── Header ── */}
      <UView className="px-6 py-6 pt-8 border-b border-white/10">
        <UView className="flex-row items-center justify-between">
          <UView className="flex-row items-center gap-3">
            <MaterialCommunityIcons name="bookmark-outline" size={28} color="#9CA3AF" />
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
        {isLoading && (
          <UView className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#9CA3AF" />
            <BodyText className="text-gray-500 mt-4">Loading your blocklists...</BodyText>
          </UView>
        )}

        {isEmpty && (
          <UView className="py-20 items-center justify-center px-8">
            <MaterialCommunityIcons name="shield-off-outline" size={48} color="#333" />
            <BodyText className="text-gray-500 mt-4 text-center">
              No saved blocklists yet. Create a commitment with app blocking to see it here.
            </BodyText>
          </UView>
        )}

        {digitalCommitments?.map((preset: DigitalPreset) => (
          <DigitalPresetCard
            key={preset._id}
            preset={preset}
            isSelected={selectedId === preset._id}
            onSelect={() => handleSelect(preset)}
            onMorePress={(x, y) => {
              setActivePreset(preset);
              setMenuPosition({ x, y });
              setMenuVisible(true);
            }}
          />
        ))}
      </UScroll>

      {/* ── Contextual Management Menu ── */}
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
              console.log("Prod: Open Edit Modal for", activePreset?._id);
              setMenuVisible(false);
            },
          },
          {
            icon: "delete-outline",
            label: "Delete",
            color: "#FF3B30",
            onPress: () => {
              setMenuVisible(false);
              setShowDeleteConfirm(true);
            },
          },
        ]}
      />

      {/* ── Deletion Confirmation ── */}
      <ConfirmationModal
        visible={showDeleteConfirm}
        title="Delete this preset?"
        confirmText="Delete"
        confirmColor="#FF3B30"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!activePreset) return;
          setIsDeleting(true);
          try {
            await deletePreset({ id: activePreset._id });
            setShowDeleteConfirm(false);
          } catch (error) {
            console.error("Prod: Deletion failed", error);
          } finally {
            setIsDeleting(false);
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </BaseDrawerModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: DigitalPresetCard
// ─────────────────────────────────────────────────────────────────────────────

function DigitalPresetCard({
  preset,
  isSelected,
  onSelect,
  onMorePress,
}: {
  preset: DigitalPreset;
  isSelected: boolean;
  onSelect: () => void;
  onMorePress: (x: number, y: number) => void;
}) {
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

        {/* ── Selection Indicator (Vertical Dots trigger menu) ── */}
        <UView 
          className="relative"
          onTouchStart={(e) => {
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
