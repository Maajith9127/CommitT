import React, { useMemo, useState, useRef, useEffect } from "react";
import { View, ScrollView, ActivityIndicator, Image, Pressable, ImageErrorEventData, NativeSyntheticEvent, TouchableOpacity, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { withUniwind } from "uniwind";
import { useQuery, useMutation } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { TabsBar } from "@/components/ui/blocklist";
import { BodyText, HeaderTitle, FooterText } from "@/components/ui/text";
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';
import { ActionMenu } from '@/components/ui/commits/ActionMenu';
import { ConfirmationModal } from '@/components/ui/modal/ConfirmationModal';
import { type LocationPreset, type DigitalPreset } from '@/stores/usePresetStore';
import { useAppStore } from '@/stores/useAppStore';
import { LocationPresetSkeleton, DigitalPresetSkeleton } from "@/components/ui/skeletons/PresetCardSkeleton";
import { THEME } from "@/constants/theme";

import { ActionScreenLayout } from "@/components/ui/ActionScreenLayout";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & STYLING
// ─────────────────────────────────────────────────────────────────────────────

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);
const UButton = withUniwind(TouchableOpacity);
const MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// ── Design System Tokens ──
// We derive map colors from the primary theme to ensure brand consistency
const MAP_PRIMARY_HEX = THEME.colors.primary.replace('#', '');
const MAP_MARKER_COLOR = `0x${MAP_PRIMARY_HEX}`;
const MAP_PATH_COLOR = `0x${MAP_PRIMARY_HEX}ff`;
const MAP_FILL_COLOR = `0x${MAP_PRIMARY_HEX}40`; // 25% opacity

type Tab = "location" | "blocks" | "rules" | "photos";

const PRESET_TABS: { key: Tab; label: string }[] = [
  { key: "location", label: "Location" },
  { key: "blocks", label: "Blocks" },
  { key: "rules", label: "Rules" },
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
  return `path=color:${MAP_PATH_COLOR}|weight:5|fillcolor:${MAP_FILL_COLOR}|${coords.join('|')}`;
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
  const marker = `size:tiny|color:${MAP_MARKER_COLOR}|${lat},${lng}`;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=${mapType}&${circlePath}&markers=${marker}&key=${MAPS_API_KEY}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function PresetsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("location");

  // --- DATA LAYER (Convex Integration) ---
  const locations = useQuery(api.api.commitments.presets.getRecommendedLocations, { limit: 20 });
  const deleteLocationPreset = useMutation(api.api.commitments.presets.deleteLocationPreset);

  const digitalPresets = useQuery(api.api.commitments.presets.getRecommendedDigitalCommitments, { limit: 20 });
  const deleteDigitalPreset = useMutation(api.api.commitments.presets.deleteDigitalPreset);

  const rulePresets = useQuery(api.api.commitments.presets.getRecommendedRules, { limit: 20 });
  const deleteRulePreset = useMutation(api.api.commitments.presets.deleteRulePreset);

  // --- UI STATE (Unified for both types of presets) ---
  const [activePreset, setActivePreset] = useState<LocationPreset | DigitalPreset | any | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // ── Layout & Animation References ──
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const horizontalScrollRef = useRef<ScrollView>(null);

  /**
   * handleTabChange
   * 
   * Orchestrates the transition when a user taps a tab in the top bar.
   * Uses programmatic scrolling to trigger the horizontal slide animation.
   */
  const handleTabChange = (key: Tab) => {
    const index = PRESET_TABS.map(t => t.key).indexOf(key);
    if (index !== -1) {
      horizontalScrollRef.current?.scrollTo({
        x: index * SCREEN_WIDTH,
        animated: true
      });
      setActiveTab(key);
    }
  };

  /**
   * handleMomentumScrollEnd
   * 
   * Synchronizes the activeTab state with the physical scroll position 
   * after a user-initiated swipe gesture.
   */
  const handleMomentumScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    const newTab = PRESET_TABS[index]?.key;
    if (newTab && newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };

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
      } else if ('apps' in activePreset) {
        // It's a DigitalPreset
        await deleteDigitalPreset({ id: activePreset._id });
      } else if ('config' in activePreset) {
        // It's a RulePreset
        await deleteRulePreset({ id: activePreset._id });
      }
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("[Presets] Deletion Failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ActionScreenLayout
      style={{ backgroundColor: THEME.colors.background }}
      header={
        <UView className="pt-2">
          <TabsBar 
            tabs={PRESET_TABS} 
            activeTab={activeTab} 
            onChange={(key) => handleTabChange(key as Tab)} 
          />
        </UView>
      }
      scrollable={false}
      fullWidthContent={true}
    >
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={{ flex: 1 }}
      >
          {/* ──────────────────────────────────────────────────────────────────
              LOCATION TAB (Page 1)
          ────────────────────────────────────────────────────────────────── */}
          <UScroll 
            style={{ width: SCREEN_WIDTH }} 
            showsVerticalScrollIndicator={false}
          >
              <UView className="pb-24">
                {locations === undefined && (
                  <UView>
                    {[1, 2, 3].map((i) => (
                      <LocationPresetSkeleton key={i} />
                    ))}
                  </UView>
                )}

                {locations !== undefined && locations.length === 0 && (
                  <UView className="py-20 items-center justify-center px-8">
                    <MaterialCommunityIcons name="map-marker-off-outline" size={48} color="white" />
                    <HeaderTitle className="mt-4 text-center text-lg">
                      No saved locations yet. Create a commitment with a location to see it here.
                    </HeaderTitle>
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
          </UScroll>

          {/* ──────────────────────────────────────────────────────────────────
              BLOCKS TAB (Page 2)
          ────────────────────────────────────────────────────────────────── */}
          <UScroll 
            style={{ width: SCREEN_WIDTH }} 
            showsVerticalScrollIndicator={false}
          >
             <UView className="pb-24">
                {digitalPresets === undefined && (
                  <UView>
                    {[1, 2, 3].map((i) => (
                      <DigitalPresetSkeleton key={i} />
                    ))}
                  </UView>
                )}

                {digitalPresets !== undefined && digitalPresets.length === 0 && (
                  <UView className="py-20 items-center justify-center px-8">
                    <MaterialCommunityIcons name="shield-off-outline" size={48} color="white" />
                    <HeaderTitle className="mt-4 text-center text-lg">
                      No saved blocklists yet. Create a commitment with app-blocking to see it here.
                    </HeaderTitle>
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
          </UScroll>

          {/* ──────────────────────────────────────────────────────────────────
              RULES TAB (Page 3)
          ────────────────────────────────────────────────────────────────── */}
          <UScroll 
            style={{ width: SCREEN_WIDTH }} 
            showsVerticalScrollIndicator={false}
          >
               <UView className="pb-24">
                {rulePresets !== undefined && rulePresets.length === 0 && (
                  <UView className="py-20 items-center justify-center px-8">
                    <MaterialCommunityIcons name="playlist-remove" size={48} color="white" />
                    <HeaderTitle className="mt-4 text-center text-lg">
                      No saved behavioral rules yet. Create one to define your focus protocols.
                    </HeaderTitle>
                  </UView>
                )}

                {rulePresets?.map((preset) => (
                  <RulePresetCard 
                    key={preset._id}
                    preset={preset}
                    onMorePress={(x, y) => handleOpenMenu(preset as any, x, y)}
                  />
                ))}
            </UView>
          </UScroll>

          {/* ──────────────────────────────────────────────────────────────────
              PHOTOS TAB (Page 4)
          ────────────────────────────────────────────────────────────────── */}
          <UScroll 
            style={{ width: SCREEN_WIDTH }} 
            showsVerticalScrollIndicator={false}
          >
            <UView className="px-6 py-20 items-center justify-center">
                <MaterialCommunityIcons name="image-multiple-outline" size={48} color="white" />
                <HeaderTitle className="mt-4 text-center text-lg">Reference photo presets coming soon.</HeaderTitle>
            </UView>
          </UScroll>
      </ScrollView>

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
              if (activePreset && 'lat' in activePreset) {
                // Location Preset — navigate to the dedicated edit map page
                router.push({
                  pathname: "/(edit-preset)/edit-location-preset",
                  params: {
                    presetId: activePreset._id,
                    lat: String(activePreset.lat),
                    lng: String(activePreset.lng),
                    radius: String(activePreset.radius),
                    address: (activePreset as any).address ?? "Selected Location",
                  },
                });
              } else if (activePreset && 'apps' in activePreset) {
                // Digital Preset — navigate to the blocklist editor
                router.push({
                  pathname: "/(edit-preset)/edit-digital-preset",
                  params: {
                    presetId: activePreset._id,
                    apps: JSON.stringify((activePreset as any).apps),
                    websites: JSON.stringify((activePreset as any).websites),
                    name: (activePreset as any).name || "Blocklist",
                  },
                });
              } else if (activePreset && 'config' in activePreset) {
                // Rule Preset — navigate to the protocol editor
                router.push({ 
                  pathname: "/(edit-preset)/edit-rule-preset", 
                  params: { 
                    presetId: activePreset._id,
                    name: (activePreset as any).title || (activePreset as any).name || "New Rule",
                    style: activePreset.config?.verification_style,
                    intensity: activePreset.config?.stay_throughout_config?.intensity || "moderate",
                    grace: activePreset.config?.grace_period_minutes?.toString() || "5",
                    lead: activePreset.config?.alarms?.lead_time_minutes?.toString() || "10",
                    interval: activePreset.config?.alarms?.interval_minutes?.toString() || "0",
                    maxMissed: activePreset.config?.stay_throughout_config?.max_missed_checkins?.toString() ?? "1",
                    waiverDeadline: (activePreset as any).penalty_waiver?.deadline_minutes?.toString() || "600"
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
        title="Delete this preset?"
        confirmText="Delete"
        confirmColor={THEME.colors.danger}
        isLoading={isDeleting}
        onConfirm={executeDeletion}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* ── Floating Add Button ── */}
      <UButton
        onPress={() => {
          if (activeTab === "location") {
            const latest = locations?.[0] as any;
            if (latest) {
              // Seed with latest data but NO presetId -> will trigger CREATE
              router.push({
                pathname: "/(edit-preset)/edit-location-preset",
                params: {
                  lat: String(latest.lat),
                  lng: String(latest.lng),
                  radius: String(latest.radius),
                  address: latest.address ?? "New Location",
                },
              });
            } else {
              // No previous history? Default to a common coordinate (Bangalore City Center) 
              // for immediate visual feedback in the map editor.
              router.push({
                pathname: "/(edit-preset)/edit-location-preset",
                params: {
                  lat: "12.9716",
                  lng: "77.5946",
                  radius: "200",
                  address: "Bangalore City Center",
                },
              });
            }
          } else if (activeTab === "blocks") {
            const latest = digitalPresets?.[0] as any;
            if (latest) {
               router.push({
                pathname: "/(edit-preset)/edit-digital-preset",
                params: {
                  apps: JSON.stringify(latest.apps),
                  websites: JSON.stringify(latest.websites),
                  name: "New Blocklist",
                },
              });
            } else {
              router.push({
                pathname: "/(edit-preset)/edit-digital-preset",
                params: { name: "New Blocklist" },
              });
            }
          } else if (activeTab === "rules") {
              // Navigate to Rule Creator with standard defaults
              router.push({
                pathname: "/(edit-preset)/edit-rule-preset",
                params: {
                  name: "New Rule",
                  style: "just_show_up",
                  intensity: "moderate",
                  grace: "5",
                  lead: "10",
                  interval: "0",
                  maxMissed: "1",
                  waiverDeadline: "600"
                }
              });
          }
        }}
        className="absolute bottom-8 right-6 h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-black/50 border"
        style={{ 
          backgroundColor: THEME.colors.surfaceLight, 
          borderColor: THEME.colors.surfaceElevated 
        }}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="plus" size={32} color={THEME.colors.primary} />
      </UButton>
    </ActionScreenLayout>
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
    <UView className="border-b" style={{ borderBottomColor: THEME.colors.surfaceElevated }}>
      <UView className="px-6 py-5 flex-row items-center">
        <MaterialCommunityIcons
          name="map-marker-outline"
          size={28}
          color={THEME.colors.textMuted}
          style={{ marginRight: 16 }}
        />
        <UView className="flex-1 mr-4 overflow-hidden">
          <HeaderTitle className="text-lg">
            {preset.address || "Unnamed Location"}
          </HeaderTitle>
          <FooterText className="text-sm">
            Within {preset.radius}m · Used {preset.usage_count}x
          </FooterText>
        </UView>

        <UView 
          className="relative"
          onTouchStart={(e) => {
            onMorePress(e.nativeEvent.pageX, e.nativeEvent.pageY);
          }}
        >
          <VerificationStatusCircle status="dots" onPress={undefined} />
        </UView>
      </UView>

      <View style={{ width: '100%', height: 160, backgroundColor: THEME.colors.surface }}>
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
            backgroundColor: THEME.colors.surface 
          }}>
            <ActivityIndicator size="small" color={THEME.colors.textMuted} />
            <BodyText style={{ color: THEME.colors.textMuted, fontSize: 10, marginTop: 8 }}>Initializing Preview...</BodyText>
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
    <UView className="border-b p-6" style={{ borderBottomColor: THEME.colors.surfaceElevated }}>
      <UView className="flex-row items-center mb-4">
        <MaterialCommunityIcons
          name="cellphone-lock"
          size={28}
          color={THEME.colors.textMuted}
          style={{ marginRight: 16 }}
        />
        <UView className="flex-1">
          <HeaderTitle className="text-lg">{displayName}</HeaderTitle>
          <FooterText className="text-sm">
            Used {preset.usage_count}x
          </FooterText>
        </UView>

        <UView 
          className="relative"
          onTouchStart={(e) => {
            onMorePress(e.nativeEvent.pageX, e.nativeEvent.pageY);
          }}
        >
          <VerificationStatusCircle status="dots" onPress={undefined} />
        </UView>
      </UView>

      {/* ── App Icon Gallery ── */}
      <UView className="pl-11">
        <ScrollView
          horizontal
          nestedScrollEnabled={true}
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
                  className="items-center justify-center rounded-xl"
                  style={{ width: 36, height: 36, backgroundColor: THEME.colors.surfaceElevated }}
                >
                  <MaterialCommunityIcons name="apps" size={20} color={THEME.colors.textMuted} />
                </UView>
              )}
              <BodyText style={{ color: THEME.colors.textMuted, fontSize: 10, marginTop: 4, maxWidth: 64, textAlign: 'center' }} numberOfLines={1}>
                {app.name}
              </BodyText>
            </UView>
          ))}
        </ScrollView>
      </UView>
    </UView>
  );
}
/**
 * RulePresetCard
 * 
 * Renders a configuration preset (Stay/Arrive logic + Alarm rhythm + Grace Period).
 * Matches the unified 'All-in-One' container layout of the Digital preset.
 */
function RulePresetCard({
  preset,
  onMorePress,
}: {
  preset: any;
  onMorePress: (x: number, y: number) => void;
}) {
  const isStay = preset.config?.verification_style === "stay_throughout";
  const intensityColor = preset.intensity === "strict" ? THEME.colors.danger : THEME.colors.primary;

  return (
    <UView className="border-b p-6" style={{ borderBottomColor: THEME.colors.surfaceElevated }}>
      <UView className="flex-row items-center mb-4">
        <MaterialCommunityIcons
          name="format-list-checks"
          size={28}
          color={THEME.colors.textMuted}
          style={{ marginRight: 16 }}
        />
        <UView className="flex-1 mr-4 overflow-hidden">
          <HeaderTitle className="text-lg">
            {preset.title || preset.name}
          </HeaderTitle>
          <FooterText className="text-sm">
            {isStay ? "Continuous Guard" : "Arrival Check"} · Used {preset.usage_count || 0}x
          </FooterText>
        </UView>

        <UView 
          className="relative"
          onTouchStart={(event: any) => {
            onMorePress(event.nativeEvent.pageX, event.nativeEvent.pageY);
          }}
        >
          <VerificationStatusCircle status="dots" onPress={undefined} />
        </UView>
      </UView>

      {/* ── Rule DNA Subheaded Manifest (Aligned to pl-11) ── */}
      <UView className="pl-11 mt-1">
        
        {/* Module 1: Type */}
        <UView className="mb-6">
          <BodyText className="text-gray-500 text-[11px] font-bold uppercase tracking-widest mb-2">Type</BodyText>
    <UView className="flex-row flex-wrap gap-2">
            <UView 
              className="px-4 py-1.5 rounded-full border"
              style={{ borderColor: THEME.colors.surfaceElevated, backgroundColor: THEME.colors.surface }}
            >
              <BodyText style={{ color: THEME.colors.textMain, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>
                {preset.config?.verification_style === 'stay_throughout' ? "Stay Throughout" : "Just Show Up"}
              </BodyText>
            </UView>
            {isStay && (
              <UView 
                className="px-4 py-1.5 rounded-full border"
                style={{ borderColor: THEME.colors.surfaceElevated, backgroundColor: THEME.colors.surface }}
              >
                <BodyText style={{ color: THEME.colors.textMain, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Max Miss: {preset.config?.stay_throughout_config?.max_missed_checkins || 3}
                </BodyText>
              </UView>
            )}
            {isStay && (
              <UView 
                className="px-4 py-1.5 rounded-full border"
                style={{ borderColor: THEME.colors.surfaceElevated, backgroundColor: THEME.colors.surface }}
              >
                <BodyText style={{ color: THEME.colors.textMain, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {preset.config?.stay_throughout_config?.intensity || "Moderate"}
                </BodyText>
              </UView>
            )}
            {!isStay && (
              <UView 
                className="px-4 py-1.5 rounded-full border"
                style={{ borderColor: THEME.colors.surfaceElevated, backgroundColor: THEME.colors.surface }}
              >
                <BodyText style={{ color: THEME.colors.textMain, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {preset.config?.grace_period_minutes || 0}m Grace
                </BodyText>
              </UView>
            )}
          </UView>
        </UView>

        {/* Module 2: Alarms */}
        <UView className="mb-6">
          <BodyText className="text-gray-500 text-[11px] font-bold uppercase tracking-widest mb-2">Alarms</BodyText>
          <UView className="flex-row flex-wrap gap-2">
            <UView 
              className="px-4 py-1.5 rounded-full border"
              style={{ borderColor: THEME.colors.surfaceElevated, backgroundColor: THEME.colors.surface }}
            >
              <BodyText style={{ color: THEME.colors.textMain, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>
                {preset.config?.alarms?.lead_time_minutes || 0} mins before
              </BodyText>
            </UView>
            {preset.config?.alarms?.interval_minutes > 0 && (
              <UView 
                className="px-4 py-1.5 rounded-full border"
                style={{ borderColor: THEME.colors.surfaceElevated, backgroundColor: THEME.colors.surface }}
              >
                <BodyText style={{ color: THEME.colors.textMain, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>
                  every {preset.config?.alarms?.interval_minutes} mins
                </BodyText>
              </UView>
            )}
          </UView>
        </UView>

      </UView>
    </UView>
  );
}
