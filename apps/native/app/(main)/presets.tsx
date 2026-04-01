import React, { useState } from "react";
import { View, ScrollView, ActivityIndicator, Image, Pressable, ImageErrorEventData, NativeSyntheticEvent } from "react-native";
import { withUniwind } from "uniwind";
import { useQuery, useMutation } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { TabsBar } from "@/components/ui/blocklist";
import { BodyText } from "@/components/ui/text";
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';
import { ActionMenu } from '@/components/ui/commits/ActionMenu';
import { ConfirmationModal } from '@/components/ui/modal/ConfirmationModal';
import { type LocationPreset } from '@/stores/usePresetStore';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & STYLING
// ─────────────────────────────────────────────────────────────────────────────

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Design System Tokens
const COLORS = {
  primary: "#4FA0FF",
  danger: "#FF3B30",
  bgCard: "#2A2A2A",
  border: "rgba(255, 255, 255, 0.1)",
  textSecondary: "#9CA3AF",
};

type Tab = "location" | "blocks" | "photos";

const PRESET_TABS: { key: Tab; label: string }[] = [
  { key: "location", label: "Location" },
  { key: "blocks", label: "Blocks" },
  { key: "photos", label: "Photos" },
];

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * createCirclePath
 * 
 * Generates an encoded path string for Google Static Maps to render a geofence.
 * Static Maps doesn't support 'Circle' primitives, so we approximate with a polygon.
 * 
 * @param lat Center Latitude
 * @param lng Center Longitude
 * @param radius Radius in meters
 * @param points Resolution of the circle (higher = smoother)
 */
function createCirclePath(lat: number, lng: number, radius: number, points: number = 24): string {
  const coords = [];
  const km = radius / 1000;
  
  // Approximate degree conversion based on Earth's circumference
  const latDegree = km / 111.32;
  const lngDegree = km / (111.32 * Math.cos(lat * Math.PI / 180));

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const pLat = lat + latDegree * Math.sin(theta);
    const pLng = lng + lngDegree * Math.cos(theta);
    coords.push(`${pLat.toFixed(6)},${pLng.toFixed(6)}`);
  }
  
  // Close the loop
  coords.push(coords[0]);
  
  // path formatting: weight, color (AA prefix for opacity), fillcolor (AA prefix)
  return `path=color:0x4FA0FFff|weight:2|fillcolor:0x4FA0FF40|${coords.join('|')}`;
}

/**
 * getStaticMapUrl
 * 
 * Returns a URL for the Google Static Maps API.
 * 
 * PROD RATIONALE: 
 * We use Static Maps in listing views instead of the Live SDK because it reduces 
 * RAM usage by ~90% and eliminates re-initialization lag when swiping tabs.
 */
function getStaticMapUrl(lat: number, lng: number, radius: number, zoom: number = 18): string {
  const circlePath = createCirclePath(lat, lng, radius);
  const size = "600x256";
  const mapType = "hybrid";
  const marker = `size:tiny|color:0x4FA0FF|${lat},${lng}`;
  
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=${mapType}&${circlePath}&markers=${marker}&key=${MAPS_API_KEY}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function PresetsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("location");

  // --- DATA LAYER (Convex Integration) ---
  const locations = useQuery(api.api.commitments.presets.getRecommendedLocations, { limit: 20 });
  const deleteLocationPreset = useMutation(api.api.commitments.presets.deleteLocationPreset);

  // --- UI STATE ---
  const [activePreset, setActivePreset] = useState<LocationPreset | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handlers
  const handleOpenMenu = (preset: LocationPreset, x: number, y: number) => {
    setActivePreset(preset);
    setMenuPosition({ x, y });
    setMenuVisible(true);
  };

  const executeDeletion = async () => {
    if (!activePreset) return;
    setIsDeleting(true);
    try {
      await deleteLocationPreset({ id: activePreset._id as any });
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("[Presets] Deletion Failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = locations === undefined;
  const isEmpty = locations !== undefined && locations.length === 0;

  return (
    <UView className="flex-1 bg-black pt-2">
      {/* ── Tab Navigation ── */}
      <UView className="px-4">
        <TabsBar 
          tabs={PRESET_TABS} 
          activeTab={activeTab} 
          onChange={(key) => setActiveTab(key as Tab)} 
        />
      </UView>

      <UScroll className="flex-1 mt-2" showsVerticalScrollIndicator={false}>
          {activeTab === "location" && (
            <UView>
                {isLoading && (
                  <UView className="py-20 items-center justify-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
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

                {locations?.map((preset) => (
                  <LocationPresetCard
                    key={preset._id}
                    preset={preset as any}
                    onMorePress={(x, y) => handleOpenMenu(preset as any, x, y)}
                  />
                ))}
            </UView>
          )}

          {activeTab === "blocks" && (
            <UView className="px-6 py-10 items-center justify-center">
                <MaterialCommunityIcons name="shield-lock-outline" size={40} color="#333" />
                <BodyText className="text-gray-500 mt-4">Digital blocklist presets coming soon.</BodyText>
            </UView>
          )}

          {activeTab === "photos" && (
            <UView className="px-6 py-10 items-center justify-center">
                <MaterialCommunityIcons name="image-multiple-outline" size={40} color="#333" />
                <BodyText className="text-gray-500 mt-4">Reference photo presets coming soon.</BodyText>
            </UView>
          )}
      </UScroll>

      {/* ── Global Context Modals ── */}
      <ActionMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        anchorPosition={menuPosition}
        items={[
          {
            icon: "pencil-outline",
            label: "Edit",
            onPress: () => {
              // Future: Integration with LocationSetScreen for editing existing presets
              setMenuVisible(false);
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
        title="Delete this preset?"
        confirmText="Delete"
        confirmColor={COLORS.danger}
        isLoading={isDeleting}
        onConfirm={executeDeletion}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </UView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LocationPresetCard
 * 
 * Reusable card representing a saved geofence configuration.
 * Optimized with Image Caching via Static Maps URL.
 */
function LocationPresetCard({
  preset,
  onMorePress,
}: {
  preset: LocationPreset;
  onMorePress: (x: number, y: number) => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const staticMapUri = getStaticMapUrl(preset.lat, preset.lng, preset.radius);

  return (
    <UView className="border-b border-white/10">
      {/* ── Info Row ── */}
      <UView className="px-6 py-5 flex-row items-center">
        <MaterialCommunityIcons
          name="map-marker-outline"
          size={28}
          color={COLORS.textSecondary}
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

        {/* --- Context Menu Trigger --- */}
        <UView 
          className="relative"
          onTouchStart={(e) => {
            onMorePress(e.nativeEvent.pageX, e.nativeEvent.pageY);
          }}
        >
          <VerificationStatusCircle status="dots" onPress={() => {}} />
        </UView>
      </UView>

      {/* ── Visual Preview Section ── */}
      <View style={{ width: '100%', height: 160, backgroundColor: COLORS.bgCard }}>
        <Image
          source={{ uri: staticMapUri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onLoad={() => setImageLoaded(true)}
          onError={(e: NativeSyntheticEvent<ImageErrorEventData>) => {
            // Silently log in prod, usually indicative of API quota or key restriction
            console.warn("[Presets] Static Map Error:", e.nativeEvent.error);
          }}
        />
        
        {/* Loading Overlay */}
        {!imageLoaded && (
          <View style={{ 
            position: 'absolute', inset: 0, 
            alignItems: 'center', justifyContent: 'center', 
            backgroundColor: COLORS.bgCard 
          }}>
            <ActivityIndicator size="small" color={COLORS.textSecondary} />
            <BodyText className="text-gray-500 text-xs mt-2">Initializing Preview...</BodyText>
          </View>
        )}
      </View>
    </UView>
  );
}
