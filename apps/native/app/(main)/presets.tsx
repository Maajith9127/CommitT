import React, { useMemo, useState } from "react";
import { View, ScrollView, ActivityIndicator, Image, Pressable, ImageErrorEventData, NativeSyntheticEvent, Text } from "react-native";
import { withUniwind } from "uniwind";
import { useQuery, useMutation } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { TabsBar } from "@/components/ui/blocklist";
import { BodyText } from "@/components/ui/text";
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';
import { ActionMenu } from '@/components/ui/commits/ActionMenu';
import { ConfirmationModal } from '@/components/ui/modal/ConfirmationModal';
import { type LocationPreset, type DigitalPreset } from '@/stores/usePresetStore';
import { useAppStore } from '@/stores/useAppStore';

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
 */
function createCirclePath(lat: number, lng: number, radius: number, points: number = 24): string {
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
  return `path=color:0x4FA0FFff|weight:2|fillcolor:0x4FA0FF40|${coords.join('|')}`;
}

/**
 * getStaticMapUrl
 * 
 * Returns a URL for the Google Static Maps API.
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

  const digitalPresets = useQuery(api.api.commitments.presets.getRecommendedDigitalCommitments, { limit: 20 });
  const deleteDigitalPreset = useMutation(api.api.commitments.presets.deleteDigitalPreset);

  // --- UI STATE (Unified for both types of presets) ---
  const [activePreset, setActivePreset] = useState<LocationPreset | DigitalPreset | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handlers
  const handleOpenMenu = (preset: LocationPreset | DigitalPreset, x: number, y: number) => {
    setActivePreset(preset);
    setMenuPosition({ x, y });
    setMenuVisible(true);
  };

  const executeDeletion = async () => {
    if (!activePreset) return;
    setIsDeleting(true);
    try {
      if ('lat' in activePreset) {
        // It's a LocationPreset
        await deleteLocationPreset({ id: activePreset._id });
      } else {
        // It's a DigitalPreset
        await deleteDigitalPreset({ id: activePreset._id });
      }
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("[Presets] Deletion Failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

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
          {/* ──────────────────────────────────────────────────────────────────
              LOCATION TAB
          ────────────────────────────────────────────────────────────────── */}
          {activeTab === "location" && (
            <UView>
                {locations === undefined && (
                  <UView className="py-20 items-center justify-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <BodyText className="text-gray-500 mt-4">Loading your locations...</BodyText>
                  </UView>
                )}

                {locations !== undefined && locations.length === 0 && (
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

          {/* ──────────────────────────────────────────────────────────────────
              BLOCKS TAB (Digital Presets)
          ────────────────────────────────────────────────────────────────── */}
          {activeTab === "blocks" && (
             <UView>
                {digitalPresets === undefined && (
                  <UView className="py-20 items-center justify-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <BodyText className="text-gray-500 mt-4">Loading your blocklists...</BodyText>
                  </UView>
                )}

                {digitalPresets !== undefined && digitalPresets.length === 0 && (
                  <UView className="py-20 items-center justify-center px-8">
                    <MaterialCommunityIcons name="shield-off-outline" size={48} color="#333" />
                    <BodyText className="text-gray-500 mt-4 text-center">
                      No saved blocklists yet. Create a commitment with app-blocking to see it here.
                    </BodyText>
                  </UView>
                )}

                {digitalPresets?.map((preset) => (
                  <DigitalPresetCard
                    key={preset._id}
                    preset={preset as any}
                    onMorePress={(x, y) => handleOpenMenu(preset as any, x, y)}
                  />
                ))}
            </UView>
          )}

          {/* ──────────────────────────────────────────────────────────────────
              PHOTOS TAB
          ────────────────────────────────────────────────────────────────── */}
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

        <UView 
          className="relative"
          onTouchStart={(e) => {
            onMorePress(e.nativeEvent.pageX, e.nativeEvent.pageY);
          }}
        >
          <VerificationStatusCircle status="dots" onPress={() => {}} />
        </UView>
      </UView>

      <View style={{ width: '100%', height: 160, backgroundColor: COLORS.bgCard }}>
        <Image
          source={{ uri: staticMapUri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onLoad={() => setImageLoaded(true)}
          onError={(e: NativeSyntheticEvent<ImageErrorEventData>) => {
            console.warn("[Presets] Static Map Error:", e.nativeEvent.error);
          }}
        />
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

/**
 * DigitalPresetCard
 * 
 * Renders a saved app-blocklist preset with an integrated icon gallery.
 * Why use this? Provides immediate visual feedback on which apps are blocked without expanding.
 */
function DigitalPresetCard({
  preset,
  onMorePress,
}: {
  preset: DigitalPreset;
  onMorePress: (x: number, y: number) => void;
}) {
  const discoveredApps = useAppStore((s: { apps: any[] }) => s.apps);

  // Resolve raw app IDs into Display Names and Icon URIs
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
    <UView className="border-b border-white/10 p-6">
      <UView className="flex-row items-center mb-4">
        <MaterialCommunityIcons
          name="cellphone-lock"
          size={28}
          color={COLORS.textSecondary}
          style={{ marginRight: 16 }}
        />
        <UView className="flex-1">
          <BodyText className="text-white text-base">{displayName}</BodyText>
          <BodyText className="text-gray-400 text-sm mt-1">
            Used {preset.usage_count}x
          </BodyText>
        </UView>

        <UView 
          className="relative"
          onTouchStart={(e) => {
            onMorePress(e.nativeEvent.pageX, e.nativeEvent.pageY);
          }}
        >
          <VerificationStatusCircle status="dots" onPress={() => {}} />
        </UView>
      </UView>

      {/* ── App Icon Gallery ── */}
      <UView className="pl-11">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', alignItems: 'center' }}
        >
          {resolvedApps.map((app) => (
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
              <Text style={{ color: '#6B7280', fontSize: 10, marginTop: 4, maxWidth: 64 }} numberOfLines={1}>
                {app.name}
              </Text>
            </UView>
          ))}
        </ScrollView>
      </UView>
    </UView>
  );
}
