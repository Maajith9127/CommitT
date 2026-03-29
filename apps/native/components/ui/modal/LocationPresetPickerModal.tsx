/**
 * LocationPresetPickerModal
 * ─────────────────────────────────────────────────────────────────────────────
 * A production-ready, reusable modal for selecting saved location presets.
 *
 * DATA SOURCE:
 *   Reads EXCLUSIVELY from the PresetStore (Zustand). Zero network requests.
 *
 * SELECTION BEHAVIOR:
 *   - The currently selected preset shows a green ✓ check circle (verified state)
 *   - All other presets show a neutral pointer circle (tappable)
 *   - Tapping a selected preset deselects it (toggle behavior)
 *   - Map previews show a loading skeleton until the tiles load
 */

import React, { useState } from 'react';
import { View, ScrollView, Platform, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GoogleMaps } from 'expo-maps';
import { useQuery } from 'convex/react';
import { api } from "@commit/backend/convex/_generated/api";

import { BaseDrawerModal } from './BaseDrawerModal';
import { HeaderTitle, BodyText } from '@/components/ui/text';
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';
import { type LocationPreset } from '@/stores/usePresetStore';

// ── Uniwind primitives ──────────────────────────────────────────────────────
const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UPressable = withUniwind(Pressable);

// ── Props ───────────────────────────────────────────────────────────────────

export interface LocationPresetPickerModalProps {
  /** Controls visibility of the modal */
  visible: boolean;
  /** Callback when the modal is dismissed */
  onClose: () => void;
  /** Callback when a location preset is selected (or null if deselected) */
  onSelect: (preset: LocationPreset | null) => void;
  /** ID of the currently selected location preset (for ✓ indicator) */
  selectedId?: string | null;
}

// ── Component ───────────────────────────────────────────────────────────────

export function LocationPresetPickerModal({
  visible,
  onClose,
  onSelect,
  selectedId,
}: LocationPresetPickerModalProps) {
  // ── Data Layer: Live Subscription from Convex ──
  // Using the RecommendedLocations query which returns the user's saved presets
  const locations = useQuery(api.api.commitments.presets.getRecommendedLocations, { limit: 12 });

  const isLoading = locations === undefined;
  const isEmpty = locations !== undefined && locations.length === 0;

  /**
   * handleSelect — Toggle-aware selection handler.
   */
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
      height="70%"
    >
      {/* ── Header ── */}
      <UView className="px-6 py-6 pt-8 border-b border-white/10">
        <UView className="flex-row items-center justify-between">
          <UView className="flex-row items-center gap-3">
            <MaterialCommunityIcons name="map-marker-outline" size={28} color="#4FA0FF" />
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
        {/* Loading State */}
        {isLoading && (
          <UView className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#4FA0FF" />
            <BodyText className="text-gray-500 mt-4">Loading your locations...</BodyText>
          </UView>
        )}

        {/* Empty State */}
        {isEmpty && (
          <UView className="py-20 items-center justify-center px-8">
            <MaterialCommunityIcons name="map-marker-off-outline" size={48} color="#333" />
            <BodyText className="text-gray-500 mt-4 text-center">
              No saved locations yet. Create a commitment with a location to see it here.
            </BodyText>
          </UView>
        )}

        {/* Preset Cards — rendered from Convex query */}
        {locations?.map((preset: LocationPreset) => (
          <LocationPresetCard
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
// SUB-COMPONENT: LocationPresetCard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LocationPresetCard
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a single location preset with:
 *   • Address + radius metadata row
 *   • VerificationStatusCircle (✓ if selected, pointer if not)
 *   • Embedded Google Map preview with loading skeleton
 */
function LocationPresetCard({
  preset,
  isSelected,
  onSelect,
}: {
  preset: LocationPreset;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [isMapReady, setIsMapReady] = useState(false);

  return (
    <UView
      className="border-b border-white/10"
    >
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

        {/* ── Selection Indicator (ONLY this is interactive now) ── */}
        <VerificationStatusCircle
          status={isSelected ? "verified" : "neutral"}
          onPress={onSelect}
        />
      </UView>

      {/* ── Map Preview with Loading Skeleton ── */}
      <UView className="w-full h-32 bg-[#2A2A2A]">
        {Platform.OS === 'android' ? (
          <View style={{ flex: 1, width: '100%' }}>
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
            {/* Map Loading Skeleton — visible until tiles finish loading */}
            {!isMapReady && (
              <View style={[StyleSheet.absoluteFill, styles.mapSkeleton]}>
                <ActivityIndicator size="small" color="#9CA3AF" />
                <BodyText className="text-gray-500 text-xs mt-2">Loading map...</BodyText>
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

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  mapSkeleton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
  },
});
