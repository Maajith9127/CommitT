import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, Text } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GoogleMaps } from 'expo-maps';
import { BodyText } from '@/components/ui/text';
import { useLocation } from "@/hooks/useLocation";
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';
import { useMutation } from 'convex/react';
import { api } from '@commit/backend/convex/_generated/api';
import { ConfirmationModal } from './ConfirmationModal';
import { updateInstanceInLocalDb } from '@/lib/local-db-commits';
import { useSQLiteContext } from "expo-sqlite";
import { Alert } from 'react-native';
import { TripleWriteOrchestrator } from "@/lib/triple-write-orchestrator";
import { useChaosStore } from "@/stores/useChaosStore";
import { scheduleNextAlarm } from '@/modules/scheduler-module';

const UView = withUniwind(View);
const UText = withUniwind(Text);

/**
 * Math utility to generate a circular polygon for geographic constraints.
 * 
 * Generates a series of coordinates representing a circular boundary. Used 
 * to render geofence visualizations on the map, particularly for inverse 
 * geofences where a transparent 'hole' is required.
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

export const LocationSection = React.memo(({ 
    event, 
    onMapTouchStart, 
    onMapTouchEnd,
    locStatus = 'neutral',
    isLocVerifying = false,
    onVerifyLoc,
    onStatusPress
}: { 
    event: any; 
    onMapTouchStart?: () => void; 
    onMapTouchEnd?: () => void;
    locStatus?: string;
    isLocVerifying?: boolean;
    onVerifyLoc?: (evidence: any) => void;
    onStatusPress?: () => void;
}) => {
    const locCondition = event?.conditions?.find((c: any) => c.metric_key === 'location');
    const { hasPermission, requestLocation, isLocating } = useLocation();
    const [isMapReady, setIsMapReady] = useState(false);
    
    // NATIVE DRAG & PIVOT STATE
    const [tempCoords, setTempCoords] = useState<{ latitude: number, longitude: number } | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    
    const db = useSQLiteContext();
    const updateConvexInstance = useMutation(api.api.instances.update.update);
    
    // Reset map initialization state when the task instance context changes.
    // This ensures that the map view re-synchronizes with the coordinates 
    // of the newly selected event and prevents stale data persistence.
    useEffect(() => {
        setIsMapReady(false);
    }, [event?._id]);

    if (!locCondition) return null;
    
    const { lat, lng, radius, address } = locCondition.target.value;
    const isInverse = locCondition.relation === 'outside';
    const relationText = locCondition.relation === 'within' ? 'Within' : 'Outside';

    // DYNAMIC COORDINATE RESOLUTION
    // Uses the temporary drag-target if it exists, otherwise falls back to saved data.
    const displayLat = tempCoords?.latitude ?? lat;
    const displayLng = tempCoords?.longitude ?? lng;

    /**
     * handleConfirmUpdate()
     * -------------------------------------------------------------------------------
     * Finalizes the location pivot. Synchronizes the new geofence coordinates to 
     * Convex first (Strict Lock verification) then persists to the local vault.
     */
    const handleConfirmUpdate = async () => {
        if (!tempCoords) return;
        setIsUpdating(true);

        const contextSnapshot = { tempCoords, instanceId: event._id };
        const orchestrator = new TripleWriteOrchestrator(contextSnapshot);

        orchestrator
          .addStep(
            "Cloud Sync (Convex Destination)",
            async (ctx) => {
              if (typeof __DEV__ !== 'undefined' && __DEV__ && useChaosStore.getState().faultCloudWrite) 
                 throw new Error("[CHAOS] Convex update failed.");

              const newConditions = (event.conditions || []).map((c: any) => {
                  if (c.metric_key === 'location') {
                      return {
                          ...c,
                          target: {
                              ...c.target,
                              value: {
                                  ...c.target.value,
                                  lat: ctx.tempCoords.latitude,
                                  lng: ctx.tempCoords.longitude,
                                  address: "Updated Location"
                              }
                          }
                      };
                  }
                  return c;
              });

              const result = await updateConvexInstance({
                  id: ctx.instanceId,
                  conditions: newConditions
              }) as any;

              if (result.success === false && result.error === "STRICT_LOCK_ACTIVE") {
                  throw new Error(result.message || "Commitment Locked");
              }

              if (!result.success) throw new Error(result.message || "Cloud sync refused");
              
              return { updatedConditions: newConditions };
            },
            async () => { /* Auto-Heal */ }
          )
          .addStep(
            "Disk Sync (Local SQLite Destination)",
            async (ctx, prev) => {
                if (typeof __DEV__ !== 'undefined' && __DEV__ && useChaosStore.getState().faultDiskWrite) 
                   throw new Error("[CHAOS] SQLite update failed.");
                
                const conditions = prev["Cloud Sync (Convex Destination)"].updatedConditions;
                await updateInstanceInLocalDb(db, ctx.instanceId, { conditions });
            }
          )
          .addStep(
            "Hardware Sync (Re-scan Geofence)",
            async () => {
                if (typeof __DEV__ !== 'undefined' && __DEV__ && useChaosStore.getState().faultHardware) 
                   throw new Error("[CHAOS] Alarm manager failed to pivot.");
                
                scheduleNextAlarm();
            }
          );

        try {
            const exec = await orchestrator.execute();
            if (!exec.success) {
                Alert.alert("Interaction Aborted", exec.error || "Device synchronization failed.");
            }
            setTempCoords(null);
            setShowConfirm(false);
        } catch (err: any) {
            Alert.alert("System Failure", err.message || String(err));
            setTempCoords(null);
            setShowConfirm(false);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <UView className="border-b border-white/20 flex-col pb-6"> 
            {/* Top Row: Icon + Address */}
            <UView className="px-6 py-6 flex-row items-center">
                <MaterialCommunityIcons name="map-marker-outline" size={28} color="#9CA3AF" style={{ marginRight: 16 }} />
                <UView className="flex-1 mr-4 overflow-hidden">
                    <BodyText className="text-white text-base">
                        {address || "Location"}
                    </BodyText>
                    <BodyText className="text-gray-400 text-sm mt-1 capitalize">
                        {relationText} {radius}m
                    </BodyText>
                </UView>
                {/* Verification Circle */}
                <VerificationStatusCircle 
                    status={locStatus as any} 
                    isLoading={isLocVerifying || isLocating}
                    onPress={async () => {
                        if (locStatus === 'failed') {
                            onStatusPress?.();
                        } else {
                            // Request GPS coordinates and pass them up as the evidence payload
                            await requestLocation((coords) => {
                                onVerifyLoc?.({ lat: coords.latitude, lng: coords.longitude });
                            });
                        }
                    }}
                />
            </UView>

            {/* Bottom Row: Map View */}
            <View 
                onTouchStart={onMapTouchStart}
                onTouchEnd={onMapTouchEnd}
                onTouchCancel={onMapTouchEnd}
            >
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
                                onMapLongClick={(e) => {
                                    setTempCoords(e.coordinates);
                                    setShowConfirm(true);
                                }}
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
                                                { latitude: displayLat, longitude: displayLng },
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
                                        center: { latitude: displayLat, longitude: displayLng },
                                        radius: radius,
                                        color: isInverse ? "transparent" : "#4FA0FF40",
                                        lineColor: "#4FA0FF",
                                        lineWidth: 12,
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
            </View>

            {/* Pivot Confirmation Logic */}
            <ConfirmationModal
                visible={showConfirm}
                title="Change location for this event?"
                confirmText="Yes, Move it"
                confirmColor="#4FA0FF"
                cancelText="Keep current"
                cancelColor="#FF3B30"
                isLoading={isUpdating}
                onConfirm={handleConfirmUpdate}
                onCancel={() => {
                    setTempCoords(null);
                    setShowConfirm(false);
                }}
            />
        </UView>
    );
}, (prev, next) => {
    const prevLoc = prev.event?.conditions?.find((c: any) => c.metric_key === 'location')?.target?.value;
    const nextLoc = next.event?.conditions?.find((c: any) => c.metric_key === 'location')?.target?.value;

    return (
        prev.event?._id === next.event?._id &&
        prev.event === next.event &&
        prev.locStatus === next.locStatus &&
        prev.isLocVerifying === next.isLocVerifying &&
        prevLoc?.lat === nextLoc?.lat &&
        prevLoc?.lng === nextLoc?.lng &&
        prevLoc?.radius === nextLoc?.radius
    );
});
