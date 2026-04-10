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
 *     pathname: "/(edit-preset)/edit-location-preset",
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
  const storeAddress = usePresetEditStore((s: any) => s.address);
  const storeLat = usePresetEditStore((s: any) => s.latitude);
  const storeLng = usePresetEditStore((s: any) => s.longitude);
  const storeRadius = usePresetEditStore((s: any) => s.radius);
  const setStoreLocation = usePresetEditStore((s: any) => s.setLocation);
  const setStoreAddress = usePresetEditStore((s: any) => s.setAddress);
  const setStoreRadius = usePresetEditStore((s: any) => s.setRadius);
  const hydrate = usePresetEditStore((s: any) => s.hydrate);
  const resetStore = usePresetEditStore((s: any) => s.reset);

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

  // ── Backend Mutations ──
  const updatePreset = useMutation(api.api.commitments.presets.updateLocationPreset);
  const createPreset = useMutation(api.api.commitments.presets.createLocationPreset);
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
  // CAMERA AUTOMATION & EXTERNAL SYNC
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Effect: Sync External Store Updates -> Map Camera
   * 
   * When the user selects a location from the separate Search page, the 
   * `usePresetEditStore` is updated. This effect detects when the store 
   * coordinates deviate from the current map camera position and forces 
   * a re-centering.
   */
  useEffect(() => {
    const latDiff = Math.abs((cameraTarget.latitude ?? 0) - storeLat);
    const lngDiff = Math.abs((cameraTarget.longitude ?? 0) - storeLng);
    
    // Use a small epsilon (0.0001) to detect intentional shifts (like search results)
    // while ignoring tiny floating point drifts during manual panning.
    // We only trigger if the user isn't currently dragging the map.
    if ((latDiff > 0.0001 || lngDiff > 0.0001) && !isUserInteracting.current) {
      setCameraTarget((prev: any) => ({
        ...prev,
        latitude: storeLat,
        longitude: storeLng,
        zoom: 19, // Reset zoom to a consistent "Detail" level for new searches
      }));
    }
  }, [storeLat, storeLng]);

  /**
   * Effect: Animate Camera to Target
   * 
   * Reactively moves the Google Maps camera whenever the `cameraTarget` state 
   * changes. Uses a high-performance 800ms transition for a premium feel.
   */
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
        } catch (err) {
          // Fallback to instant jump if animation fails (e.g. low memory/background)
          try { await mapRef.current?.setCameraPosition(target); } catch {}
        }
      };
      animate();
    }
  }, [cameraTarget.latitude, cameraTarget.longitude, cameraTarget.zoom, mapReady]);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleLocate = useCallback(async () => {
    if (isLocating) return;
    await requestLocation(async (coords) => {
      const newPos = { latitude: coords.latitude, longitude: coords.longitude };
      isUserInteracting.current = false;
      setCameraTarget((prev) => ({ ...prev, ...newPos, zoom: 19 }));
      setStoreLocation({ ...newPos, address: "Current Location" });
    });
  }, [isLocating, requestLocation]);

  const handleRadiusChange = useCallback((val: number) => {
    setStoreRadius(Math.round(val));
  }, []);

  const handleSavePreset = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (presetId) {
        await updatePreset({
          id: presetId,
          address: storeAddress,
          lat: storeLat,
          lng: storeLng,
          radius: storeRadius,
        });
      } else {
        await createPreset({
          address: storeAddress,
          lat: storeLat,
          lng: storeLng,
          radius: storeRadius,
        });
      }
      router.back();
    } catch (error) {
      console.error("[EditPreset] Save failed:", error);
      setIsSaving(false);
    }
  }, [isSaving, updatePreset, createPreset, presetId, storeAddress, storeLat, storeLng, storeRadius, router]);

  if (Platform.OS !== "android") {
    return <Text>Maps only supported on Android native builds.</Text>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
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
        onCameraMoveStarted={() => { isUserInteracting.current = true; }}
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
        onMapLongClick={(e: { coordinates: { latitude: number; longitude: number } }) => {
          setStoreLocation({
            latitude: e.coordinates.latitude,
            longitude: e.coordinates.longitude,
            address: storeAddress,
          });
        }}
        circles={[
          {
            center: { latitude: storeLat, longitude: storeLng },
            radius: storeRadius,
            color: "#4FA0FF40",
            lineColor: "#4FA0FF",
            lineWidth: 12,
          },
        ]}
      />

      <LocationMapNavBar
        onBack={() => { Keyboard.dismiss(); router.back(); }}
        onLocate={() => { Keyboard.dismiss(); handleLocate(); }}
        onSearch={() => {
          Keyboard.dismiss();
          router.push("/(edit-preset)/search-preset-location");
        }}
      />

      <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0 }, animatedPanelStyle]}>
        <PresetEditPanel
          address={storeAddress}
          radius={storeRadius}
          isSaving={isSaving}
          onAddressChange={setStoreAddress}
          onRadiusChange={handleRadiusChange}
          onSearchPress={() => {
            Keyboard.dismiss();
            router.push("/(edit-preset)/search-preset-location");
          }}
          onCenterPress={() => {
            Keyboard.dismiss();
            isUserInteracting.current = false;
            setCameraTarget((prev) => ({ ...prev, latitude: storeLat, longitude: storeLng, zoom: 19 }));
          }}
          onSave={handleSavePreset}
        />
      </Animated.View>
    </View>
  );
}

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
      {isEditingName ? (
        <UView className="flex-row items-center bg-[#2A2A2A] rounded-2xl px-3 h-12">
          <Input
            value={address}
            onChangeText={onAddressChange}
            onBlur={() => setIsEditingName(false)}
            autoFocus
            className="flex-1 bg-transparent p-0 font-semibold text-white text-base"
            placeholder="Edit preset name..."
          />
          <UButton onPress={() => Keyboard.dismiss()} className="ml-2">
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
            <UButton onPress={() => setIsEditingName(true)} className="ml-2" activeOpacity={0.7}>
              <MaterialCommunityIcons name="pencil" size={20} color="white" />
            </UButton>
            <UButton onPress={onSearchPress} className="ml-2" activeOpacity={0.7}>
               <MaterialCommunityIcons name="magnify" size={22} color="white" />
            </UButton>
          </UView>
        </UView>
      )}

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

      <UView className="mt-4">
        <PrimaryButton onPress={onSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Preset"}
        </PrimaryButton>
      </UView>
    </UView>
  );
}
