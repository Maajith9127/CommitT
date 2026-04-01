import React, { useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator, Platform, StyleSheet, Pressable } from "react-native";
import { withUniwind } from "uniwind";
import { useQuery, useMutation } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GoogleMaps } from 'expo-maps';

import { TabsBar } from "@/components/ui/blocklist";
import { BodyText, HeaderTitle } from "@/components/ui/text";
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';
import { ActionMenu } from '@/components/ui/commits/ActionMenu';
import { ConfirmationModal } from '@/components/ui/modal/ConfirmationModal';
import { type LocationPreset } from '@/stores/usePresetStore';

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UPressable = withUniwind(Pressable);

type Tab = "location" | "blocks" | "photos";

const TABS = [
  { key: "location", label: "Location" },
  { key: "blocks", label: "Blocks" },
  { key: "photos", label: "Photos" },
];

export default function PresetsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("location");

  // --- Location Logic ---
  const locations = useQuery(api.api.commitments.presets.getRecommendedLocations, { limit: 20 });
  const deleteLocationPreset = useMutation(api.api.commitments.presets.deleteLocationPreset);

  const [activePreset, setActivePreset] = useState<LocationPreset | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoading = locations === undefined;
  const isEmpty = locations !== undefined && locations.length === 0;

  return (
    <UView className="flex-1 bg-black pt-2">
      <UView className="px-4">
        <TabsBar 
          tabs={TABS} 
          activeTab={activeTab} 
          onChange={(key) => setActiveTab(key as Tab)} 
        />
      </UView>

      <UScroll className="flex-1 mt-2" showsVerticalScrollIndicator={false}>
          {activeTab === "location" && (
            <UView>
                {isLoading && (
                  <UView className="py-20 items-center justify-center">
                    <ActivityIndicator size="large" color="#4FA0FF" />
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

                {locations?.map((preset, index) => (
                  <LocationPresetCard
                    key={preset._id}
                    index={index}
                    preset={preset as any}
                    isSelected={false} // No selection mode in Management Hub
                    onSelect={() => {}}
                    onMorePress={(x, y) => {
                      setActivePreset(preset as any);
                      setMenuPosition({ x, y });
                      setMenuVisible(true);
                    }}
                  />
                ))}
            </UView>
          )}

          {activeTab === "blocks" && (
            <UView className="px-6 py-4">
                <BodyText className="text-gray-400">Digital blocklist presets will appear here.</BodyText>
            </UView>
          )}

          {activeTab === "photos" && (
            <UView className="px-6 py-4">
                <BodyText className="text-gray-400">Reference photo presets will appear here.</BodyText>
            </UView>
          )}
      </UScroll>

      {/* --- Management Modals --- */}
      <ActionMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        anchorPosition={menuPosition}
        items={[
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
            await deleteLocationPreset({ id: activePreset._id as any });
            setShowDeleteConfirm(false);
          } catch (error) {
            console.error("Deletion failed", error);
          } finally {
            setIsDeleting(false);
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </UView>
  );
}

// Re-using the premium LocationPresetCard component
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
            onMorePress(e.nativeEvent.pageX, e.nativeEvent.pageY);
          }}
        >
          <VerificationStatusCircle
            status="dots"
            onPress={() => {}}
          />
        </UView>
      </UView>

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
