import { View, Platform, Text } from "react-native";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { GoogleMaps, GoogleMapsView } from "expo-maps";

import { LocationConditionPanel } from "@/components/ui/location/LocationConditionalPanel";
import { LocationMapNavBar } from "@/components/ui/location/LocationMapNavBar";
import { useLocation } from "@/hooks/useLocation";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";

// ─────────────────────────────────────────────────────────────────────────────
// MATHEMATICAL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getCirclePoints
 * 
 * Generates a perfect coordinate array for drawing circular polygons on Google Maps.
 * Why is this needed natively? 
 * While Google Maps natively supports drawing `Circles`, it does NOT support punching 
 * "holes" in polygons using a Circle. To achieve "Inverse Geofencing" (e.g., "Must be OUTSIDE the gym"),
 * we draw a massive red polygon over the entire Earth, but we need to cut a transparent 
 * hole precisely around the user's selected location. This function calculates that hole.
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
// COMPONENT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LocationSetScreen (`/app/(create-commit)/location-set.tsx`)
 * 
 * A purely native map interface utilizing `expo-maps` (Google Maps View on Android).
 * 
 * ARCHITECTURE OVERVIEW:
 * 1. Global State Binding:
 *    We heavily utilize `useTaskDraftStore` not just for storing the final geofence boundary (`location`),
 *    but also for the `cameraTarget`. This ensures that if the user backs out to `final.tsx` and 
 *    returns here, the map's exact pan/zoom state is perfectly preserved.
 * 
 * 2. Interaction Flags (`isUserInteracting`):
 *    A critical `useRef` that prevents infinite render loops. If a user is physically dragging 
 *    the map, we block automated camera animations that might attempt to snap the map back.
 * 
 * 3. Native Layer Pre-requisites:
 *    This component will purposely crash/fallback on iOS simulators unless purely tested via Android, 
 *    as it requires direct Kotlin `MapView` bindings injected via Expo configuration.
 */
export default function LocationSetScreen() {
  const router = useRouter();

  // 1. ZUSTAND GLOBAL STORES 
  const conditions = useTaskDraftStore((s) => s.draft.conditions);
  const setLocation = useTaskDraftStore((s) => s.setLocation);
  const cameraTarget = useTaskDraftStore((s) => s.draft.cameraTarget);
  const setCameraTarget = useTaskDraftStore((s) => s.setCameraTarget);
  
  // Parse the explicitly selected geofence (if any)
  const locationCondition = conditions.find((c: any) => c.metric_key === "location");
  const location = locationCondition ? {
    latitude: locationCondition.target.value.lat,
    longitude: locationCondition.target.value.lng,
    radius: locationCondition.target.value.radius,
    address: locationCondition.target.value.address ?? "Selected Location",
    isInverse: locationCondition.relation === "outside"
  } : null;

  // 2. NATIVE MAP REFS & STATE
  const mapRef = useRef<GoogleMapsView>(null);
  const [mapReady, setMapReady] = useState(false);
  
  // 3. DEVICE PERMISSIONS & SENSORS
  const { hasPermission, requestLocation, isLocating } = useLocation();

  // 4. ANIMATION CONTROL FLAGS
  const isUserInteracting = useRef(false);

  // Set the fallback boot location. (Defaulting to Riyadh coordinates from previous sessions)
  const initialPos = useRef({
    latitude: cameraTarget?.latitude ?? location?.latitude ?? 24.543232,
    longitude: cameraTarget?.longitude ?? location?.longitude ?? 46.5108992,
  }).current;
  const initialZoom = useRef(cameraTarget?.zoom ?? 19).current;

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECTS & HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Smooth Camera Automation Effect
   * Runs whenever the global `cameraTarget` changes, commanding the native map instance
   * to smoothly fly to the new coordinates, provided the user isn't currently dragging it.
   */
  useEffect(() => {
    if (cameraTarget?.latitude && cameraTarget?.longitude && mapReady && !isUserInteracting.current) {
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
        } catch (e) {
          // Fallback to instantaneous snap if Native animation engine fails
          try {
            await mapRef.current?.setCameraPosition(target);
          } catch (err) {}
        }
      };
      animate();
    }
  }, [
    cameraTarget?.latitude, 
    cameraTarget?.longitude, 
    cameraTarget?.zoom,
    cameraTarget?.tilt,
    cameraTarget?.bearing,
    mapReady
  ]);

  /**
   * Hardware GPS Request
   * Asks the OS for current hardware coordinates, locks the map interaction, 
   * and snaps the camera directly to the user's location.
   */
  const handleLocate = async () => {
    if (isLocating) return;

    await requestLocation(async (coords) => {
      const newPos = { latitude: coords.latitude, longitude: coords.longitude };
      
      isUserInteracting.current = false; // Override any user drag
      setCameraTarget({ ...newPos, zoom: 19 });
      
      setLocation({
        ...newPos,
        address: "Current Location",
        radius: 20,
        isInverse: false,
      });
    });
  };

  // Failsafe boundary for unsupported platforms
  if (Platform.OS !== "android") {
    return <Text>Maps only supported on Android native builds.</Text>;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER TREE
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      
      {/* --- LAYER 1: STRICT NATIVE MAP INTERFACE --- */}
      <GoogleMaps.View
        ref={mapRef}
        style={{ flex: 1 }}
        cameraPosition={{
          coordinates: initialPos,
          zoom: initialZoom,
        }}
        mapOptions={{
          mapId: "7702036af0cdf4aa60ff733d", // Cloud-styled dark map ID
        }}
        uiSettings={{
          myLocationButtonEnabled: false, // We use our custom UI button instead
        }}
        properties={{
          mapType: "HYBRID",
          isMyLocationEnabled: hasPermission === true,
        }}
        onMapLoaded={() => {
          setMapReady(true);
        }}
        onCameraMoveStarted={() => {
           // User touched the map, lock automation to prevent fighting
           isUserInteracting.current = true;
        }}
        onCameraMove={(e) => {
           // Continuous pan tracking
           if (e?.cameraPosition?.coordinates) {
              isUserInteracting.current = true;
           }
        }}
        onCameraIdle={async () => {
           // Fired strictly when momentum scrolling completely stops
           if (mapRef.current) {
             const pos = await mapRef.current.getCameraPosition();
             
             // Sync final resting position back to global store
             setCameraTarget({
                latitude: pos.coordinates.latitude,
                longitude: pos.coordinates.longitude,
                zoom: pos.zoom,
                tilt: pos.tilt,
                bearing: pos.bearing
             });
             
             // Unlock automated animations
             isUserInteracting.current = false;
           }
        }}
        onMapClick={(e: { coordinates: { latitude: number; longitude: number } }) => {
          // Tapping the raw map acts as a command to fly there
          isUserInteracting.current = false; 
          setCameraTarget({
            latitude: e.coordinates.latitude,
            longitude: e.coordinates.longitude,
            zoom: cameraTarget?.zoom ?? 19
          });
        }}
        onMapLongClick={(e: { coordinates: { latitude: number; longitude: number } }) => {
          // Long press actually DROPS a new geofence pin, 
          // preserving the existing radius config if we are just moving an old pin.
          if (location) {
            setLocation({
              ...location,
              ...e.coordinates,
            });
          } else {
            setLocation({
              ...e.coordinates,
              radius: 20,
              isInverse: false,
              address: "Selected Location",
            });
          }
        }}
        polygons={
          // INVERSE GEOFENCING ROUTINE
          location?.isInverse
            ? [
                {
                  coordinates: [
                    // Corner bounds of the entire map
                    { latitude: 85, longitude: -179.9 },
                    { latitude: 85, longitude: 0 },
                    { latitude: 85, longitude: 179.9 },
                    { latitude: -85, longitude: 179.9 },
                    { latitude: -85, longitude: 0 },
                    { latitude: -85, longitude: -179.9 },
                    { latitude: 85, longitude: -179.9 },
                    // Reversing the getCirclePoints sequence punches the 'hole' out
                    ...getCirclePoints(
                      { latitude: location.latitude, longitude: location.longitude },
                      location.radius,
                    ).reverse(),
                  ],
                  color: "#4FA0FF40", 
                  lineWidth: 0,
                },
              ]
            : []
        }
        circles={
          // TRADITIONAL GEOFENCING ROUTINE
          location
            ? [
                {
                  center: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                  },
                  radius: location.radius,
                  // If inverse is active, the circle border remains visible but its core is completely hollow
                  color: location.isInverse ? "transparent" : "#4FA0FF40",
                  lineColor: "#4FA0FF",
                  lineWidth: 12, // Thick strokes render beautifully on mobile
                },
              ]
            : []
        }
      />

      {/* --- LAYER 2: FLOATING UI NAVIGATOR --- */}
      <LocationMapNavBar
        onBack={() => router.back()}
        onLocate={handleLocate}
        onSearch={() => router.push("/(create-commit)/searchpac")}
      />

      {/* --- LAYER 3: BOTTOM CONDITION SLIDER --- */}
      <LocationConditionPanel
        onSearchPress={() => router.push("/(create-commit)/searchpac")}
        onCenterPress={() => {
          // Button to snap map directly BACK to the dropped pin if user is lost
          if (location) {
            isUserInteracting.current = false;
            setCameraTarget({ 
              latitude: location.latitude, 
              longitude: location.longitude,
              zoom: 19 
            });
          }
        }}
      />
    </View>
  );
}
