import { useState, useEffect } from "react";
import { Alert, Linking } from "react-native";
import * as Location from "expo-location";

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export function useLocation() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Initial check for permission on mount
  useEffect(() => {
    Location.getForegroundPermissionsAsync().then((status) => {
      if (status.granted) {
        setHasPermission(true);
      }
    });
  }, []);

  /**
   * The core logic to check, request, and fetch location.
   * Returns the coordinates if successful, or null otherwise.
   */
  const requestLocation = async (onSuccess?: (coords: LocationCoords) => void) => {
    if (isLocating) return null;
    setIsLocating(true);

    try {
      // 2. Check current location permission status
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

      let finalStatus = status;

      // 3. Branch based on permission state
      if (status !== "granted") {
        if (canAskAgain) {
          // CASE B — Permission NOT granted, but askable
          const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
          finalStatus = newStatus;
        } else {
          // CASE C — Permission BLOCKED
          setHasPermission(false);
          Alert.alert(
            "Location Access Disabled",
            "Location access is disabled. Please enable it in Settings to use this feature.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ],
          );
          return null;
        }
      }

      if (finalStatus === "granted") {
        // CASE A — Permission already GRANTED (or just granted)
        setHasPermission(true);

        // 4. Fetch current device location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const coords: LocationCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        console.log(" Fetched Coordinates:", coords);

        // 5. Update screen's location state (Single source of truth)
        setCurrentLocation(coords);

        // Allow the caller to run extra logic (like camera animation)
        onSuccess?.(coords);

        return coords;
      } else {
        setHasPermission(false);
        return null;
      }
    } catch (error) {
      console.error("Error fetching location:", error);
      Alert.alert("Error", "Could not fetch your current location. Please try again.");
      return null;
    } finally {
      setIsLocating(false);
    }
  };

  return {
    hasPermission,
    currentLocation,
    isLocating,
    requestLocation,
  };
}
