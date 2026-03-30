/**
 * LocationPresetPickerModal
 * ─────────────────────────────────────────────────────────────────────────────
 * A production-ready, reusable modal for selecting saved location presets.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, Platform, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GoogleMaps } from 'expo-maps';
import { useQuery, useMutation } from 'convex/react';
import { api } from "@commit/backend/convex/_generated/api";

import { BaseDrawerModal } from './BaseDrawerModal';
import { ConfirmationModal } from './ConfirmationModal';
import { HeaderTitle, BodyText } from '@/components/ui/text';
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';
import { ActionMenu } from '@/components/ui/commits/ActionMenu';
import { type LocationPreset } from '@/stores/usePresetStore';

// ── Uniwind primitives ──────────────────────────────────────────────────────
const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UPressable = withUniwind(Pressable);

// ── Props ───────────────────────────────────────────────────────────────────

export interface LocationPresetPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (preset: LocationPreset | null) => void;
  selectedId?: string | null;
}

export function LocationPresetPickerModal({
  visible,
  onClose,
  onSelect,
  selectedId,
}: LocationPresetPickerModalProps) {
  const locations = useQuery(api.api.commitments.presets.getRecommendedLocations, { limit: 12 });
  
  // ── UI Logic: Context Menu State ──
  const [activePreset, setActivePreset] = useState<LocationPreset | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // ── Deletion Flow State ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const deletePreset = useMutation(api.api.commitments.presets.deleteLocationPreset);

  const isLoading = locations === undefined;
  const isEmpty = locations !== undefined && locations.length === 0;

  function handleSelect(preset: LocationPreset) {
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
            <HeaderTitle className="text-2xl">Saved Locations</HeaderTitle>
          </UView>
          <UPressable onPress={onClose} hitSlop={10}>
            <MaterialCommunityIcons name="close" size={24} color="white" />
          </UPressable>
        </UView>
        <BodyText className="text-gray-400 mt-2 ml-1">
          Select a location to attach to this time slot
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
            <BodyText className="text-gray-500 mt-4">Loading your locations...</BodyText>
          </UView>
        )}

        {isEmpty && (
          <UView className="py-20 items-center justify-center px-8">
            <MaterialCommunityIcons name="map-marker-off-outline" size={48} color="#333" />
            <BodyText className="text-gray-500 mt-4 text-center">
              No saved locations yet. Create a commitment with a location to see it here.
            </BodyText>
          </UView>
        )}

        {locations?.map((preset: LocationPreset, index: number) => (
          <LocationPresetCard
            key={preset._id}
            index={index}
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
// SUB-COMPONENT: LocationPresetCard
// ─────────────────────────────────────────────────────────────────────────────

function LocationPresetCard({
  preset,
  index,
  isSelected,
  onSelect,
  onMorePress,
}: {
  preset: LocationPreset;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onMorePress: (x: number, y: number) => void;
}) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    const delay = Math.floor(index / 2) * 300;
    const timer = setTimeout(() => setShouldRender(true), delay);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <UView className="border-b border-white/10">
      {/* ── Address Row ── */}
      <UView className="px-6 py-5 flex-row items-center">
        <MaterialCommunityIcons
          name="map-marker-outline"
          size={28}
          color="#9CA3AF"
          style={{ marginRight: 16 }}
        />
        <UView className="flex-1 mr-4 overflow-hidden">
          <BodyText className="text-white text-base" numberOfLines={1}>
            {preset.address || "Unnamed Location"}
          </BodyText>
          <BodyText className="text-gray-400 text-sm mt-1">
            Within {preset.radius}m · Used {preset.usage_count}x
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

      {/* ── Map Preview ── */}
      <UView className="w-full h-32 bg-[#2A2A2A]">
        {Platform.OS === 'android' ? (
          <View style={{ flex: 1, width: '100%' }}>
            {shouldRender ? (
              <GoogleMaps.View
                style={{ flex: 1, width: '100%' }}
                cameraPosition={{
                  coordinates: { latitude: preset.lat, longitude: preset.lng },
                  zoom: 16,
                }}
                uiSettings={{
                  myLocationButtonEnabled: false,
                  zoomControlsEnabled: false,
                  compassEnabled: false,
                  mapToolbarEnabled: false,
                  scrollGesturesEnabled: false,
                  zoomGesturesEnabled: false,
                  tiltGesturesEnabled: false,
                  rotateGesturesEnabled: false,
                }}
                properties={{
                  mapType: 'HYBRID',
                  isMyLocationEnabled: false,
                }}
                onMapLoaded={() => setIsMapReady(true)}
                circles={[
                  {
                    center: { latitude: preset.lat, longitude: preset.lng },
                    radius: preset.radius,
                    color: "#4FA0FF40",
                    lineColor: "#4FA0FF",
                    lineWidth: 8,
                  },
                ]}
              />
            ) : null}
            {(!shouldRender || !isMapReady) && (
              <View style={[StyleSheet.absoluteFill, styles.mapSkeleton]}>
                <ActivityIndicator size="small" color="#9CA3AF" />
                <BodyText className="text-gray-500 text-xs mt-2">
                  {!shouldRender ? "Queued..." : "Loading map..."}
                </BodyText>
              </View>
            )}
          </View>
        ) : (
          <UView className="flex-1 items-center justify-center">
            <MaterialCommunityIcons name="google-maps" size={32} color="#4B5563" />
          </UView>
        )}
      </UView>
    </UView>
  );
}

const styles = StyleSheet.create({
  mapSkeleton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
  },
});
