/**
 * LocationPresetPickerModal
 * ─────────────────────────────────────────────────────────────────────────────
 * A production-ready, reusable modal for selecting saved location presets.
 */

import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

const MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES (Static Maps API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * createCirclePath
 * Generates an encoded path string for Google Static Maps to render a geofence.
 */
function createCirclePath(lat: number, lng: number, radius: number, points: number = 40): string {
  const coords = [];
  const km = radius / 1000;
  const latDegree = km / 111.32;
  const lngDegree = km / (111.32 * Math.cos(lat * Math.PI / 180));

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const pLat = lat + latDegree * Math.sin(theta);
    const pLng = lng + lngDegree * Math.cos(theta);
    coords.push(`${pLat.toFixed(6)},${pLng.toFixed(6)}`);
  }
  coords.push(coords[0]);
  return `path=color:0x4FA0FFff|weight:5|fillcolor:0x4FA0FF40|${coords.join('|')}`;
}

/**
 * getStaticMapUrl
 * Returns a URL for the Google Static Maps API for high-performance preview rendering.
 */
function getStaticMapUrl(lat: number, lng: number, radius: number, zoom: number = 18): string {
  const circlePath = createCirclePath(lat, lng, radius);
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=600x256&maptype=hybrid&${circlePath}&markers=size:tiny|color:0x4FA0FF|${lat},${lng}&key=${MAPS_API_KEY}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MODAL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function LocationPresetPickerModal({
  visible,
  onClose,
  onSelect,
  selectedId,
}: LocationPresetPickerModalProps) {
  const locations = useQuery(api.api.commitments.presets.getRecommendedLocations, { limit: 12 });
  
  const [activePreset, setActivePreset] = useState<LocationPreset | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
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
    <BaseDrawerModal visible={visible} onClose={onClose} height="78%">
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

        {locations?.map((preset: LocationPreset) => (
          <LocationPresetCard
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
  isSelected,
  onSelect,
  onMorePress,
}: {
  preset: LocationPreset;
  isSelected: boolean;
  onSelect: () => void;
  onMorePress: (x: number, y: number) => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const staticMapUri = getStaticMapUrl(preset.lat, preset.lng, preset.radius);

  return (
    <UView className="border-b border-white/10">
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

      <UView className="w-full h-32 bg-[#2A2A2A]">
        <Image
          source={{ uri: staticMapUri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onLoad={() => setImageLoaded(true)}
        />
        {!imageLoaded && (
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A2A2A' }}>
            <ActivityIndicator size="small" color="#9CA3AF" />
            <BodyText className="text-gray-500 text-xs mt-2">Initializing Preview...</BodyText>
          </View>
        )}
      </UView>
    </UView>
  );
}

export interface LocationPresetPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (preset: LocationPreset | null) => void;
  selectedId?: string | null;
}
