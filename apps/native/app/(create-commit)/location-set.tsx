import { View, Platform, Text } from "react-native";
import { useEffect, useRef, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { GoogleMaps, GoogleMapsView } from "expo-maps";

import { LocationConditionPanel } from "@/components/ui/location/LocationConditionalPanel";
import { LocationMapNavBar } from "@/components/ui/location/LocationMapNavBar";
import { useLocation } from "@/hooks/useLocation";

import { useTaskDraftStore } from "@/stores/useTaskDraftStore";

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

export default function LocationSetScreen() {
  const router = useRouter();
  const location = useTaskDraftStore((s) => s.draft.location);
  const cameraTarget = useTaskDraftStore((s) => s.draft.cameraTarget);
  const setLocation = useTaskDraftStore((s) => s.setLocation);
  const setCameraTarget = useTaskDraftStore((s) => s.setCameraTarget);

  const mapRef = useRef<GoogleMapsView>(null);
  const [mapReady, setMapReady] = useState(false);
  const { hasPermission, requestLocation, isLocating } = useLocation();

  // Track if the camera update comes from user interaction to avoid loops
  const isUserInteracting = useRef(false);

  // Determine initial position only on mount to prevent the map from jumping
  const initialPos = useRef({
    latitude: cameraTarget?.latitude ?? location?.latitude ?? 24.543232,
    longitude: cameraTarget?.longitude ?? location?.longitude ?? 46.5108992,
  }).current;

  const initialZoom = useRef(cameraTarget?.zoom ?? 19).current;

  // Camera animation effect - responds to cameraTarget changes
  // Only animate if the change didn't come from the user dragging the map
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

  const handleLocate = async () => {
    if (isLocating) return;

    await requestLocation(async (coords) => {
      const newPos = { latitude: coords.latitude, longitude: coords.longitude };
      
      isUserInteracting.current = false; // Programmatic update
      setCameraTarget({ ...newPos, zoom: 19 });
      
      setLocation({
        ...newPos,
        address: "Current Location",
        radius: 20,
        isInverse: false,
      });
    });
  };

  if (Platform.OS !== "android") {
    return <Text>Maps only supported on Android</Text>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {/* MAP */}
      <GoogleMaps.View
        ref={mapRef}
        style={{ flex: 1 }}
        cameraPosition={{
          coordinates: initialPos,
          zoom: initialZoom,
        }}
        mapOptions={{
          mapId: "7702036af0cdf4aa60ff733d",
        }}
        uiSettings={{
          myLocationButtonEnabled: false,
        }}
        properties={{
          mapType: "HYBRID",
          isMyLocationEnabled: hasPermission === true,
        }}
        onMapLoaded={() => {
          console.log(" Google map loaded and ready");
          setMapReady(true);
        }}
        onCameraMoveStarted={() => {
           isUserInteracting.current = true;
        }}
        onCameraMove={(e) => {
          // Just track locally to avoid crash and rapid store updates
          if (e?.cameraPosition?.coordinates) {
             isUserInteracting.current = true;
             // We could store it in a ref here if needed, but onCameraIdle is better for the final sync
          }
        }}
        onCameraIdle={async () => {
           if (mapRef.current) {
             // Get exact camera position when movement stops
             const pos = await mapRef.current.getCameraPosition();
             
             // Update global store so next time we open map, it's here
             setCameraTarget({
                latitude: pos.coordinates.latitude,
                longitude: pos.coordinates.longitude,
                zoom: pos.zoom,
                tilt: pos.tilt,
                bearing: pos.bearing
             });
             
             // Allow programmatic updates again
             isUserInteracting.current = false;
           }
        }}
        onMapClick={(e: { coordinates: { latitude: number; longitude: number } }) => {
          isUserInteracting.current = false; // Click is a command to move there
          setCameraTarget({
            latitude: e.coordinates.latitude,
            longitude: e.coordinates.longitude,
            // Keep current zoom if possible, or default
            zoom: cameraTarget?.zoom ?? 19
          });
        }}
        onMapLongClick={(e: { coordinates: { latitude: number; longitude: number } }) => {
          // Long press sets the ACTUAL location for the circle
          // We preserve the existing address and settings (radius, isInverse)
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
          location?.isInverse
            ? [
                {
                  coordinates: [
                    { latitude: 85, longitude: -179.9 },
                    { latitude: 85, longitude: 0 },
                    { latitude: 85, longitude: 179.9 },
                    { latitude: -85, longitude: 179.9 },
                    { latitude: -85, longitude: 0 },
                    { latitude: -85, longitude: -179.9 },
                    { latitude: 85, longitude: -179.9 },
                    ...getCirclePoints(
                      { latitude: location.latitude, longitude: location.longitude },
                      location.radius,
                    ).reverse(),
                  ],
                  color: "#4FA0FF40", // Darker brand blue
                  lineWidth: 0,
                },
              ]
            : []
        }
        circles={
          location
            ? [
                {
                  center: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                  },
                  radius: location.radius,
                  color: location.isInverse ? "transparent" : "#4FA0FF40",
                  lineColor: "#4FA0FF",
                  lineWidth: 12,
                },
              ]
            : []
        }
      />

      {/* TOP NAV */}
      <LocationMapNavBar
        onBack={() => router.back()}
        onLocate={handleLocate}
        onSearch={() => router.push("/(create-commit)/searchpac")}
      />

      {/* BOTTOM PANEL */}
      <LocationConditionPanel
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
