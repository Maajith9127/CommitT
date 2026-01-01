import { View, Platform, Text } from "react-native";
import { useEffect, useRef, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { GoogleMaps } from "expo-maps";

import { LocationConditionPanel } from "@/components/ui/location/LocationConditionalPanel";
import { LocationMapNavBar } from "@/components/ui/location/LocationMapNavBar";
import { useLocation } from "@/hooks/useLocation";

import { useTaskDraftStore } from "@/stores/useTaskDraftStore";

const getCirclePoints = (center: { latitude: number, longitude: number }, radius: number, points: number = 60) => {
    const coords = [];
    const distanceLat = (radius / 111320);
    const distanceLng = (radius / (111320 * Math.cos(center.latitude * (Math.PI / 180))));

    for (let i = 0; i <= points; i++) {
        const theta = (i / points) * (2 * Math.PI);
        coords.push({
            latitude: center.latitude + (distanceLat * Math.sin(theta)),
            longitude: center.longitude + (distanceLng * Math.cos(theta)),
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

    // Determine initial position only on mount to prevent the map from jumping
    const initialPos = useRef({
        latitude: cameraTarget?.latitude ?? location?.latitude ?? 24.543232,
        longitude: cameraTarget?.longitude ?? location?.longitude ?? 46.5108992
    }).current;

    // Camera animation effect - responds to cameraTarget changes
    useEffect(() => {
        if (cameraTarget?.latitude && cameraTarget?.longitude && mapReady) {
            const target = {
                coordinates: { 
                    latitude: cameraTarget.latitude, 
                    longitude: cameraTarget.longitude 
                },
                zoom: 19,
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
    }, [cameraTarget?.latitude, cameraTarget?.longitude, mapReady]);

    const handleLocate = async () => {
        if (isLocating) return;

        await requestLocation(async (coords) => {
            const newPos = { latitude: coords.latitude, longitude: coords.longitude };
            setLocation({
                ...newPos,
                address: "Current Location",
                radius: 20,
                isInverse: false
            });
            setCameraTarget(newPos);
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
                    zoom: 19,
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
                onMapClick={(e: { coordinates: { latitude: number, longitude: number } }) => {
                    // Single click moves the CAMERA target
                    setCameraTarget(e.coordinates);
                }}
                onMapLongClick={(e: { coordinates: { latitude: number, longitude: number } }) => {
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
                            address: "Selected Location"
                        });
                    }
                }}
                polygons={location?.isInverse ? [{
                    coordinates: [
                        { latitude: 85, longitude: -179.9 },
                        { latitude: 85, longitude: 0 },
                        { latitude: 85, longitude: 179.9 },
                        { latitude: -85, longitude: 179.9 },
                        { latitude: -85, longitude: 0 },
                        { latitude: -85, longitude: -179.9 },
                        { latitude: 85, longitude: -179.9 },
                        ...getCirclePoints({ latitude: location.latitude, longitude: location.longitude }, location.radius).reverse()
                    ],
                    color: "#4FA0FF40", // Darker brand blue
                    lineWidth: 0,
                }] : []}
                circles={location ? [{
                    center: { 
                        latitude: location.latitude, 
                        longitude: location.longitude 
                    },
                    radius: location.radius,
                    color: location.isInverse ? "transparent" : "#4FA0FF40",
                    lineColor: "#4FA0FF",
                    lineWidth: 12,
                }] : []}
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
                        setCameraTarget({ latitude: location.latitude, longitude: location.longitude });
                    }
                }}
            />
        </View>
    );
}
