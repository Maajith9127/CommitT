import { View, Platform, Text, TouchableOpacity, Keyboard, KeyboardEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { GoogleMaps, GoogleMapsView } from "expo-maps";
import { useMutation } from "convex/react";
import { api } from "@commit/backend/convex/_generated/api";
import { withUniwind } from "uniwind";

import { LocationMapNavBar } from "@/components/ui/location/LocationMapNavBar";
import { useLocation } from "@/hooks/useLocation";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { PrimaryButton } from "@/components/ui/button";
import { CustomSlider } from "@/components/ui/CustomSlider";
import { Input } from "@/components/ui/input";
import { usePresetEditStore } from "@/stores/usePresetEditStore";

// ─────────────────────────────────────────────────────────────────────────────
// MATHEMATICAL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getCirclePoints
 *
 * Generates a perfect coordinate array for drawing circular geofence polygons.
 * Reused from location-set.tsx — identical math to ensure visual consistency
 * between the create and edit flows.
 */
const getCirclePoints = (
  center: { latitude: number; longitude: number },
  radius: number,
  points: number = 60,
) => {
  const coords = [];
  const distanceLat = radius / 111320;
  const distanceLng = radius / (111320 * Math.cos(center.latitude * (Math.PI / 180)));

  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    coords.push({
      latitude: center.latitude + distanceLat * Math.sin(theta),
      longitude: center.longitude + distanceLng * Math.cos(theta),
    });
  }
  return coords;
};

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE PARAMS CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Expected search params passed from the Presets Hub when the user taps "Edit":
 *
 *   router.push({
 *     pathname: "/(create-commit)/edit-location-preset",
 *     params: { presetId, lat, lng, radius, address },
 *   });
 *
 * WHY PARAMS + STORE?
 *   Params seed the initial values on first mount.
 *   The store (`usePresetEditStore`) keeps state in sync when the user
 *   navigates to the search page and selects a new location.
 */
type EditParams = {
  presetId: string;
  lat: string;
  lng: string;
  radius: string;
  address: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EditLocationPresetScreen
 *
 * A standalone map interface for editing an existing location preset.
 * Architecturally identical to `location-set.tsx` but operates on
 * `usePresetEditStore` (not `useTaskDraftStore`), and persists changes
 * via the `updateLocationPreset` Convex mutation.
 *
 * KEY DESIGN DECISIONS:
 * 1. Dedicated Store — `usePresetEditStore` bridges this page and the
 *    search sub-page without touching the commitment creation draft.
 * 2. Editable Address — The address field in the bottom panel is directly
 *    editable via a text input, giving users full control over naming.
 * 3. Same Map UX — Tap to fly, long-press to drop pin, GPS locate button.
 * 4. Optimistic Navigation — Router.back() fires immediately after save;
 *    Convex reactivity handles the Presets Hub refresh.
 */
export default function EditLocationPresetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<EditParams>();

  // ── Parse initial values from search params ──
  const presetId = params.presetId as any;
  const initialLat = parseFloat(params.lat ?? "0");
  const initialLng = parseFloat(params.lng ?? "0");
  const initialRadius = parseFloat(params.radius ?? "20");
  const initialAddress = params.address ?? "Selected Location";

  // ── Bridge Store (shared with search-preset-location) ──
  const storeAddress = usePresetEditStore((s) => s.address);
  const storeLat = usePresetEditStore((s) => s.latitude);
  const storeLng = usePresetEditStore((s) => s.longitude);
  const storeRadius = usePresetEditStore((s) => s.radius);
  const setStoreLocation = usePresetEditStore((s) => s.setLocation);
  const setStoreAddress = usePresetEditStore((s) => s.setAddress);
  const setStoreRadius = usePresetEditStore((s) => s.setRadius);
  const hydrate = usePresetEditStore((s) => s.hydrate);
  const resetStore = usePresetEditStore((s) => s.reset);

  // ── Hydrate store on first mount ──
  const hasHydrated = useRef(false);
  useEffect(() => {
    if (!hasHydrated.current) {
      hydrate({
        address: initialAddress,
        latitude: initialLat,
        longitude: initialLng,
        radius: initialRadius,
      });
      hasHydrated.current = true;
    }
  }, []);

  // ── Cleanup store on unmount ──
  useEffect(() => {
    return () => { resetStore(); };
  }, []);

  // ── Map State ──
  const mapRef = useRef<GoogleMapsView>(null);
  const [mapReady, setMapReady] = useState(false);
  const isUserInteracting = useRef(false);
  const [cameraTarget, setCameraTarget] = useState({
    latitude: initialLat,
    longitude: initialLng,
    zoom: 19,
    tilt: 0,
    bearing: 0,
  });

  // ── Device Sensors ──
  const { hasPermission, requestLocation, isLocating } = useLocation();

  // ── Backend Mutation ──
  const updatePreset = useMutation(api.api.commitments.presets.updateLocationPreset);
  const [isSaving, setIsSaving] = useState(false);

  // ── Keyboard Tracking (Reanimated – translateY only, always visible) ──
  const keyboardHeight = useSharedValue(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => {
        keyboardHeight.value = withTiming(e.endCoordinates.height, { duration: 250 });
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        keyboardHeight.value = withTiming(0, { duration: 250 });
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const animatedPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardHeight.value }],
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // CAMERA AUTOMATION
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (cameraTarget.latitude && cameraTarget.longitude && mapReady && !isUserInteracting.current) {
      const target = {
        coordinates: {
          latitude: cameraTarget.latitude,
          longitude: cameraTarget.longitude,
        },
        zoom: cameraTarget.zoom ?? 19,
        tilt: cameraTarget.tilt ?? 0,
        bearing: cameraTarget.bearing ?? 0,
      };

      const animate = async () => {
        try {
          await mapRef.current?.setCameraPosition({ ...target, duration: 800 });
        } catch {
          try { await mapRef.current?.setCameraPosition(target); } catch {}
        }
      };
      animate();
    }
  }, [cameraTarget.latitude, cameraTarget.longitude, cameraTarget.zoom, mapReady]);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  /** GPS locate: snap camera and pin to hardware coordinates. */
  const handleLocate = useCallback(async () => {
    if (isLocating) return;
    await requestLocation(async (coords) => {
      const newPos = { latitude: coords.latitude, longitude: coords.longitude };
      isUserInteracting.current = false;
      setCameraTarget((prev) => ({ ...prev, ...newPos, zoom: 19 }));
      setStoreLocation({ ...newPos, address: "Current Location" });
    });
  }, [isLocating, requestLocation]);

  /** Radius slider update. */
  const handleRadiusChange = useCallback((val: number) => {
    setStoreRadius(Math.round(val));
  }, []);

  /**
   * Save Preset — Fires the updateLocationPreset mutation.
   * Navigates back immediately; Convex reactivity handles the UI refresh.
   */
  const handleSavePreset = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await updatePreset({
        id: presetId,
        address: storeAddress,
        lat: storeLat,
        lng: storeLng,
        radius: storeRadius,
      });
      router.back();
    } catch (error) {
      console.error("[EditPreset] Save failed:", error);
      setIsSaving(false);
    }
  }, [isSaving, updatePreset, presetId, storeAddress, storeLat, storeLng, storeRadius, router]);

  // ── Platform Guard ──
  if (Platform.OS !== "android") {
    return <Text>Maps only supported on Android native builds.</Text>;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER TREE
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>

      {/* ── LAYER 1: NATIVE MAP INTERFACE ── */}
      <GoogleMaps.View
        ref={mapRef}
        style={{ flex: 1 }}
        cameraPosition={{
          coordinates: { latitude: initialLat, longitude: initialLng },
          zoom: 19,
        }}
        mapOptions={{ mapId: "7702036af0cdf4aa60ff733d" }}
        uiSettings={{ myLocationButtonEnabled: false }}
        properties={{
          mapType: "HYBRID",
          isMyLocationEnabled: hasPermission === true,
        }}
        onMapLoaded={() => setMapReady(true)}
        onCameraMoveStarted={() => { 
          isUserInteracting.current = true;
        }}
        onCameraMove={(e: any) => {
          if (e?.cameraPosition?.coordinates) isUserInteracting.current = true;
        }}
        onCameraIdle={async () => {
          if (mapRef.current) {
            const pos = await mapRef.current.getCameraPosition();
            setCameraTarget({
              latitude: pos.coordinates.latitude,
              longitude: pos.coordinates.longitude,
              zoom: pos.zoom,
              tilt: pos.tilt,
              bearing: pos.bearing,
            });
            isUserInteracting.current = false;
          }
        }}
        onMapClick={(e: { coordinates: { latitude: number; longitude: number } }) => {
          isUserInteracting.current = false;
        }}
        onMapLongClick={(e: { coordinates: { latitude: number; longitude: number } }) => {
          setStoreLocation({
            latitude: e.coordinates.latitude,
            longitude: e.coordinates.longitude,
            address: storeAddress,
          });
        }}
        circles={[
          {
            center: {
              latitude: storeLat,
              longitude: storeLng,
            },
            radius: storeRadius,
            color: "#4FA0FF40",
            lineColor: "#4FA0FF",
            lineWidth: 12,
          },
        ]}
      />

      {/* ── LAYER 2: FLOATING NAV BAR ── */}
      <LocationMapNavBar
        onBack={() => {
          Keyboard.dismiss();
          router.back();
        }}
        onLocate={() => {
          Keyboard.dismiss();
          handleLocate();
        }}
        onSearch={() => {
          Keyboard.dismiss();
          router.push("/(create-commit)/search-preset-location");
        }}
      />

      {/* ── LAYER 3: BOTTOM EDIT PANEL (slides up with keyboard) ── */}
      <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0 }, animatedPanelStyle]}>
        <PresetEditPanel
          address={storeAddress}
          radius={storeRadius}
          isSaving={isSaving}
          onAddressChange={setStoreAddress}
          onRadiusChange={handleRadiusChange}
          onSearchPress={() => {
            Keyboard.dismiss();
            router.push("/(create-commit)/search-preset-location");
          }}
          onCenterPress={() => {
            Keyboard.dismiss();
            isUserInteracting.current = false;
            setCameraTarget((prev) => ({
              ...prev,
              latitude: storeLat,
              longitude: storeLng,
              zoom: 19,
            }));
          }}
          onSave={handleSavePreset}
        />
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESET EDIT PANEL (Bottom Sheet)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PresetEditPanel
 *
 * A purpose-built bottom control panel for location preset editing.
 */
function PresetEditPanel({
  address,
  radius,
  isSaving,
  onAddressChange,
  onRadiusChange,
  onSearchPress,
  onCenterPress,
  onSave,
}: {
  address: string;
  radius: number;
  isSaving: boolean;
  onAddressChange: (val: string) => void;
  onRadiusChange: (val: number) => void;
  onSearchPress: () => void;
  onCenterPress: () => void;
  onSave: () => void;
}) {
  const [isEditingName, setIsEditingName] = useState(false);

  return (
    <UView className="m-4 mb-8 rounded-3xl bg-[#1A1A1A] px-4 py-4">

      {/* ── Location Name (Tap to edit) ── */}
      {isEditingName ? (
        <UView 
          className="flex-row items-center bg-[#2A2A2A] rounded-2xl px-3 h-12"
          style={{ width: '100%' }}
        >
          <Input
            value={address}
            onChangeText={onAddressChange}
            onBlur={() => setIsEditingName(false)}
            autoFocus
            className="flex-1 bg-transparent p-0 font-semibold text-white text-base"
            placeholder="Edit preset name..."
          />
          <UButton 
            onPress={() => Keyboard.dismiss()}
            className="ml-2"
          >
            <MaterialCommunityIcons name="close-circle" size={20} color="#666" />
          </UButton>
        </UView>
      ) : (
        <UView className="flex-row items-center justify-between">
          <UButton onPress={onCenterPress} activeOpacity={0.7} className="flex-1">
            <HeaderTitle className="text-base text-[#4FA0FF]" numberOfLines={1}>
              {address}
            </HeaderTitle>
          </UButton>
        <UView className="flex-row items-center">
          <UButton
            onPress={() => setIsEditingName(true)}
            className="ml-2"
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="pencil" size={20} color="white" />
          </UButton>
          <UButton
            onPress={onSearchPress}
            className="ml-2"
            activeOpacity={0.7}
          >
             <MaterialCommunityIcons name="magnify" size={22} color="white" />
          </UButton>
        </UView>
        </UView>
      )}

      {/* ── Radius Slider ── */}
      <UView className="mt-4">
        <UView className="flex-row justify-between items-center">
          <HeaderTitle className="text-sm">Radius</HeaderTitle>
          <FooterText className="text-[#4FA0FF]">{radius} m</FooterText>
        </UView>

        <CustomSlider
          minimumValue={20}
          maximumValue={2000}
          step={10}
          value={radius}
          onValueChange={onRadiusChange}
          className="mt-2 h-10"
        />
      </UView>

      {/* ── Save Button ── */}
      <UView className="mt-4">
        <PrimaryButton onPress={onSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Preset"}
        </PrimaryButton>
      </UView>
    </UView>
  );
}
