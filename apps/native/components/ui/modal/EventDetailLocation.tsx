import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, Text } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GoogleMaps } from 'expo-maps';
import { BodyText } from '@/components/ui/text';
import { useLocation } from "@/hooks/useLocation";

const UView = withUniwind(View);
const UText = withUniwind(Text);

/**
 * Math utility to generate a perfect circle polygon for Google Maps.
 * Why? Google Maps natively supports "Circles", but our "Outside" inverse geofencing
 * requires drawing a massive polygon covering the whole world with a hole punched out of it.
 * This generates the precise coordinates for that "hole".
 */
export const getCirclePoints = (
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

export const LocationSection = ({ event }: { event: any }) => {
    const locCondition = event?.conditions?.find((c: any) => c.metric_key === 'location');
    const { hasPermission } = useLocation();
    const [isMapReady, setIsMapReady] = useState(false);
    
    useEffect(() => {
        setIsMapReady(false);
    }, [event]);

    if (!locCondition) return null;
    
    const { lat, lng, radius, address } = locCondition.target.value;
    const isInverse = locCondition.relation === 'outside';
    const relationText = locCondition.relation === 'within' ? 'Within' : 'Outside';

    return (
        <UView className="border-b border-white/20 flex-col pb-6"> 
            {/* Top Row: Icon + Address */}
            <UView className="px-6 py-4">
                <UView className="flex-row items-center">
                    <MaterialCommunityIcons name="map-marker-outline" size={24} color="#9CA3AF" style={{ marginRight: 16 }} />
                    <UView className="flex-1">
                            <UText className="text-white text-base" numberOfLines={2}>
                                {address || "Location"}
                            </UText>
                        <BodyText className="text-gray-400 text-sm capitalize">
                            {relationText} {radius}m
                        </BodyText>
                    </UView>
                </UView>
            </UView>

            {/* Bottom Row: Map View */}
            <UView className="w-full h-48 relative items-center justify-center bg-gray-700">
                    {Platform.OS === 'android' ? (
                        <View style={{ flex: 1, width: '100%' }}>
                            <GoogleMaps.View
                                style={{ flex: 1, width: '100%' }}
                                cameraPosition={{
                                    coordinates: { latitude: lat, longitude: lng },
                                    zoom: 18,
                                }}
                                uiSettings={{
                                    myLocationButtonEnabled: false,
                                    zoomControlsEnabled: false,
                                    compassEnabled: false,
                                    mapToolbarEnabled: false,
                                    scrollGesturesEnabled: true,
                                    zoomGesturesEnabled: true,
                                    tiltGesturesEnabled: true,
                                    rotateGesturesEnabled: true,
                                }}
                                properties={{
                                    mapType: 'HYBRID',
                                    isMyLocationEnabled: hasPermission === true,
                                }}
                                onMapLoaded={() => setIsMapReady(true)}
                                // If mapping an "Outside" constraint, draw the entire world
                                // in semi-red, and punch out a transparent hole for the valid area!
                                polygons={
                                    isInverse
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
                                                { latitude: lat, longitude: lng },
                                                radius,
                                            ).reverse(),
                                            ],
                                            color: "#4FA0FF40",
                                            lineWidth: 0,
                                        },
                                        ]
                                    : []
                                }
                                circles={[
                                    {
                                        center: { latitude: lat, longitude: lng },
                                        radius: radius,
                                        color: isInverse ? "transparent" : "#4FA0FF40",
                                        lineColor: "#4FA0FF",
                                        lineWidth: 2,
                                    },
                                ]}
                            />
                            {!isMapReady && (
                                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#374151' }]} >
                                    <ActivityIndicator size="small" color="#9CA3AF" />
                                </View>
                            )}
                        </View>
                    ) : (
                        <MaterialCommunityIcons name="google-maps" size={32} color="#4B5563" />
                    )}
            </UView>
        </UView>
    );
};
