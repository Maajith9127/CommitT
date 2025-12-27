import { View, Platform, Text } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { GoogleMaps } from "expo-maps";

import { LocationConditionPanel } from "@/components/ui/location/LocationConditionalPanel";
import { LocationMapNavBar } from "@/components/ui/location/LocationMapNavBar";

export default function LocationSetScreen() {
    const router = useRouter();

    useEffect(() => {
        console.log("🟢 LocationSetScreen mounted");
    }, []);

    if (Platform.OS !== "android") {
        return <Text>Maps only supported on Android</Text>;
    }

    return (
        <View style={{ flex: 1, backgroundColor: "black" }}>
            {/* MAP */}
            <GoogleMaps.View
                style={{ flex: 1 }}
                cameraPosition={{
                    coordinates: {
                        latitude: 12.96,
                        longitude: 77.59,
                    },
                    zoom: 15,
                }}
                onMapLoaded={() => console.log("🟢 Google map loaded")}
                onMapClick={(e) =>
                    console.log("📍 Map clicked:", e.coordinates)
                }
            />

            {/* TOP NAV */}
            <LocationMapNavBar
                onBack={() => router.back()}
                onLocate={() => console.log("📍 Locate")}
                onSearch={() => console.log("🔍 Search")}
            />

            {/* BOTTOM PANEL */}
            <LocationConditionPanel />
        </View>
    );
}
