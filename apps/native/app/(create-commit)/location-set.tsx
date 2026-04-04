import { View, Platform, Text } from "react-native";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "expo-router";
import { GoogleMaps, GoogleMapsView } from "expo-maps";

import { LocationConditionPanel } from "@/components/ui/location/LocationConditionalPanel";
import { LocationMapNavBar } from "@/components/ui/location/LocationMapNavBar";
import { useLocation } from "@/hooks/useLocation";
import { useTaskDraftStore } from "@/stores/useTaskDraftStore";

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * MATHEMATICAL LAYER: CIRCULAR GEOFENCING
 * ═════════════════════════════════════════════════════════════════════════════
 */

/**
 * Generates an array of GPS coordinates representing a circle.
 * 
 * DESIGN RATIONALE:
 * Google Maps natively supports 'Circles', but specifically for "Inverse Geofencing" 
 * (where the user must stay OUTSIDE a zone), we need to draw a 'Donut' polygon. 
 * This function calculates the coordinates for the inner 'hole' of that donut.
 *
 * @param center - The lat/lng of the geofence center.
 * @param radius - Radius in meters.
 * @param points - Precision of the circle (default 60 for high-fidelity).
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

// Corner bounds representing the entire world (used for punching inverse holes)
const WORLD_BOUNDS = [
  { latitude: 85, longitude: -179.9 },
  { latitude: 85, longitude: 0 },
  { latitude: 85, longitude: 179.9 },
  { latitude: -85, longitude: 179.9 },
  { latitude: -85, longitude: 0 },
  { latitude: -85, longitude: -179.9 },
  { latitude: 85, longitude: -179.9 },
];

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * UI LAYER: LOCATION SETUP SCREEN
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Handles the native coordinate selection for commitments. Supports standard 
 * 'Entry' geofences and 'Hollowed' inverse geofences.
 */
export default function LocationSetScreen() {
  const router = useRouter();

  // --- 1. GLOBAL STATE BINDINGS ---
  const conditions = useTaskDraftStore((s: any) => s.draft.conditions);
  const setLocation = useTaskDraftStore((s: any) => s.setLocation);
  const cameraTarget = useTaskDraftStore((s: any) => s.draft.cameraTarget);
  const setCameraTarget = useTaskDraftStore((s: any) => s.setCameraTarget);
  
  // --- 2. LOCAL KINETIC STATE ---
  // Memoized location state ensures UI doesn't flicker on minor draft updates
  const location = useMemo(() => {
    const cond = conditions.find((c: any) => c.metric_key === "location");
    if (!cond) return null;

    return {
      latitude: cond.target.value.lat,
      longitude: cond.target.value.lng,
      radius: cond.target.value.radius,
      address: cond.target.value.address ?? "Selected Location",
      isInverse: cond.relation === "outside"
    };
  }, [conditions]);

  const [localRadius, setLocalRadius] = useState<number>(location?.radius ?? 20);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<GoogleMapsView>(null);
  const isUserInteracting = useRef(false);

  // Sync kinetic local radius with the store's "final" radius
  useEffect(() => {
    if (location?.radius) setLocalRadius(location.radius);
  }, [location?.radius]);

  // --- 3. HARDWARE & PERMISSIONS ---
  const { hasPermission, requestLocation, isLocating } = useLocation();

  // Initial boot position (Riyadh fallback)
  const initialPos = useRef({
    latitude: cameraTarget?.latitude ?? location?.latitude ?? 24.543232,
    longitude: cameraTarget?.longitude ?? location?.longitude ?? 46.5108992,
  }).current;
  const initialZoom = useRef(cameraTarget?.zoom ?? 19).current;

  // --- 4. GEOFENCE VISUALS (MEMOIZED) ---
  
  const polygonsData = useMemo(() => {
    if (!location?.isInverse) return [];
    
    return [{
      coordinates: [
        ...WORLD_BOUNDS,
        ...getCirclePoints(
          { latitude: location.latitude, longitude: location.longitude },
          localRadius
        ).reverse(),
      ],
      color: "#4FA0FF40",
      lineWidth: 0,
    }];
  }, [location?.latitude, location?.longitude, location?.isInverse, localRadius]);

  const circlesData = useMemo(() => {
    if (!location) return [];

    return [{
      center: { latitude: location.latitude, longitude: location.longitude },
      radius: localRadius,
      color: location.isInverse ? "transparent" : "#4FA0FF40",
      lineColor: "#4FA0FF",
      lineWidth: 12,
    }];
  }, [location?.latitude, location?.longitude, location?.isInverse, localRadius]);

  // --- 5. EVENT HANDLERS ---

  /** 
   * Orchestrates smooth flight to a specific camera position. 
   */
  const flyToTarget = useCallback(async (target: any) => {
    if (!mapRef.current || isUserInteracting.current) return;
    
    try {
      await mapRef.current.setCameraPosition({ ...target, duration: 800 });
    } catch (e) {
      // Hardware failsafe: Snap instantly
      mapRef.current?.setCameraPosition(target); 
    }
  }, []);

  /** 
   * Triggers hardware GPS location lookup. 
   */
  const handleLocate = useCallback(async () => {
    if (isLocating) return;

    await requestLocation(async (coords) => {
      const newPos = { latitude: coords.latitude, longitude: coords.longitude };
      isUserInteracting.current = false;
      
      setCameraTarget({ ...newPos, zoom: 19 });
      setLocation({
        ...newPos,
        address: "Current Location",
        radius: 20,
        isInverse: false,
      });
    });
  }, [isLocating, requestLocation, setCameraTarget, setLocation]);

  /**
   * Syncs camera location effect
   */
  useEffect(() => {
    if (cameraTarget?.latitude && mapReady && !isUserInteracting.current) {
      flyToTarget({
        coordinates: { latitude: cameraTarget.latitude, longitude: cameraTarget.longitude },
        zoom: cameraTarget.zoom ?? 19,
        tilt: cameraTarget.tilt ?? 0,
        bearing: cameraTarget.bearing ?? 0,
      });
    }
  }, [cameraTarget, mapReady, flyToTarget]);

  // --- 6. PLATFORM GUARD ---
  if (Platform.OS !== "android") {
    return (
      <View style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "white" }}>Maps only supported on Android</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      
      {/* ──────────────────────────────────────────────────────────────────────
          NATIVE GOOGLE MAPS INSTANCE
          ────────────────────────────────────────────────────────────────────── */}
      <GoogleMaps.View
        ref={mapRef}
        style={{ flex: 1 }}
        cameraPosition={{ coordinates: initialPos, zoom: initialZoom }}
        mapOptions={{ mapId: "7702036af0cdf4aa60ff733d" }}
        uiSettings={{ myLocationButtonEnabled: false }}
        properties={{ 
          mapType: "HYBRID", 
          isMyLocationEnabled: hasPermission === true 
        }}
        
        onMapLoaded={() => setMapReady(true)}
        onCameraMoveStarted={() => { isUserInteracting.current = true; }}
        
        onCameraIdle={async () => {
          if (!mapRef.current) return;
          const pos = await mapRef.current.getCameraPosition();
          
          setCameraTarget({
            latitude: pos.coordinates.latitude,
            longitude: pos.coordinates.longitude,
            zoom: pos.zoom,
            tilt: pos.tilt,
            bearing: pos.bearing
          });
          isUserInteracting.current = false;
        }}

        onMapClick={(e) => {
          isUserInteracting.current = false; 
          setCameraTarget({ ...e.coordinates, zoom: cameraTarget?.zoom ?? 19 });
        }}

        onMapLongClick={(e) => {
          setLocation({
            ...location,
            ...e.coordinates,
            radius: location?.radius ?? 20,
            isInverse: location?.isInverse ?? false,
            address: location?.address ?? "Selected Location",
          });
        }}

        polygons={polygonsData}
        circles={circlesData}
      />

      {/* ──────────────────────────────────────────────────────────────────────
          OVERLAY UI LAYES
          ────────────────────────────────────────────────────────────────────── */}
      
      <LocationMapNavBar
        onBack={() => router.back()}
        onLocate={handleLocate}
        onSearch={() => router.push("/(create-commit)/searchpac")}
      />

      <LocationConditionPanel
        localRadius={localRadius}
        setLocalRadius={setLocalRadius}
        onSearchPress={() => router.push("/(create-commit)/searchpac")}
        onCenterPress={() => {
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
