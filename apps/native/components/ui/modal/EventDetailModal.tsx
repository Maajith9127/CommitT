import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, Pressable, Text, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GoogleMaps } from 'expo-maps';
import { PrimaryButton } from '@/components/ui/button';
import { AuthHeading, BodyText } from '@/components/ui/text';
import { useLocation } from "@/hooks/useLocation";
import dayjs from 'dayjs';

const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);
const UText = withUniwind(Text);
const UScroll = withUniwind(ScrollView);

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DOMAIN MAPS (MOCK DATA / UI CONFIG)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps penalty keys from the backend database to their respective UI representations.
 * Used to dynamically render the correct icon, title, and description.
 */
const PENALTY_MAP: Record<string, { icon: any; title: string; subtitle: string }> = {
  money: { icon: 'currency-inr', title: 'Money Penalty', subtitle: 'Lose a fixed amount when you miss' },
  photo: { icon: 'camera-enhance-outline', title: 'Embarrassing Photo', subtitle: 'Send a cringe picture to someone' },
  message: { icon: 'message-alert-outline', title: 'Cringe Message', subtitle: 'A shameful message gets sent to a contact' },
  blockapp: { icon: 'cellphone-off', title: 'Block Favourite App', subtitle: 'Your chosen app gets blocked temporarily' },
};

/**
 * Maps waiver keys from the backend database to their respective UI representations.
 * Waivers are tasks the user can perform to bypass a penalty if they failed their main commitment.
 */
const WAIVER_MAP: Record<string, { icon: any; title: string; subtitle: string }> = {
  captcha: { icon: 'shield-check-outline', title: 'Solve CAPTCHAs', subtitle: 'Solve a set number of CAPTCHAs' },
  paragraph: { icon: 'pencil-outline', title: 'Write a Long Paragraph', subtitle: 'Type a 3000-word paragraph' },
  intense: { icon: 'fire', title: 'Redo With More Intensity', subtitle: 'Repeat tomorrow with a harder version' },
  run: { icon: 'run-fast', title: 'Run 5 KM', subtitle: 'Choose a location and complete the run' },
};

// ─────────────────────────────────────────────────────────────────────────────
// MODULAR SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic blueprint for rendering a condition row (used by Penalty and Waiver sections)
 */
const InfoSection = ({ icon, color, title, subtitle }: { icon: any; color: string; title: string; subtitle: string }) => (
  <UView className="border-b border-white/20 flex-row p-6 items-center">
    <MaterialCommunityIcons name={icon} size={28} color={color} style={{ marginRight: 16 }} />
    <UView className="flex-1">
      <BodyText className="text-white text-lg font-semibold">{title}</BodyText>
      <BodyText className="text-gray-400 text-sm mt-1">{subtitle}</BodyText>
    </UView>
  </UView>
);

/**
 * Parses the event's `conditions` array to find a penalty, mapping it to the UI.
 * Failsafe: Defaults to 'money' if no specific penalty is defined but a penalty rule exists.
 */
const PenaltySection = ({ event }: { event: any }) => {
  const penaltyCondition = event?.conditions?.find((c: any) => PENALTY_MAP[c.metric_key] || c.type === 'penalty');
  
  const key = penaltyCondition?.metric_key || 'money';
  const info = PENALTY_MAP[key] || PENALTY_MAP['money'];

  return <InfoSection icon={info.icon} color="#FF3B30" title={info.title} subtitle={info.subtitle} />;
};

/**
 * Parses the event's `conditions` array to find a waiver, mapping it to the UI.
 * Failsafe: Defaults to 'captcha' if no specific waiver is defined.
 */
const WaiverSection = ({ event }: { event: any }) => {
  const waiverCondition = event?.conditions?.find((c: any) => WAIVER_MAP[c.metric_key] || c.type === 'waiver');

  const key = waiverCondition?.metric_key || 'captcha';
  const info = WAIVER_MAP[key] || WAIVER_MAP['captcha'];

  return <InfoSection icon={info.icon} color="#4CD964" title={info.title} subtitle={info.subtitle} />;
};

/**
 * Math utility to generate a perfect circle polygon for Google Maps.
 * Why? Google Maps natively supports "Circles", but our "Outside" inverse geofencing
 * requires drawing a massive polygon covering the whole world with a hole punched out of it.
 * This generates the precise coordinates for that "hole".
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

const LocationSection = ({ event }: { event: any }) => {
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
        <UView className="border-b border-white/20 flex-row h-32"> 
            {/* Left Box: Icon + Address */}
            <UView className="flex-1 p-6 justify-center">
                <UView className="flex-row">
                    <MaterialCommunityIcons name="map-marker-outline" size={24} color="#9CA3AF" style={{ marginRight: 16, marginTop: 2 }} />
                    <UView className="flex-1">
                            <UText className="text-white text-base" numberOfLines={2}>
                                {address || "Location"}
                            </UText>
                        <BodyText className="text-gray-400 text-sm mt-1 capitalize">
                            {relationText} {radius}m
                        </BodyText>
                    </UView>
                </UView>
            </UView>

            {/* Right Box: Map View */}
            <UView className="w-[55%] h-full border-l border-white/10 relative items-center justify-center bg-gray-700">
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
                                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#374151' }]}>
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

interface EventDetailModalProps {
  visible: boolean;
  /** Function to set `selectedEvent` to null in the global Zustand store */
  onClose: () => void;
  /** The full data payload of the selected Task instance */
  event: any;
}

/**
 * EventDetailModal (Global Singleton Pattern)
 * 
 * This UI component renders the rich details of a selected calendar event or task commit.
 * 
 * **CRITICAL ARCHITECTURE NOTE:**
 * Do NOT mount this modal inside individual screens (like schedules.tsx or commits.tsx).
 * It is hoisted to the root `_layout.tsx` to prevent React Navigation from double-mounting it
 * across background tabs, ensuring zero-lag instantiation and perfectly flat 60fps performance.
 */
export function EventDetailModal({ visible, onClose, event }: EventDetailModalProps) {
  const { hasPermission } = useLocation();
  const [cachedEvent, setCachedEvent] = useState(event);

  // Cache the event so that when closing (event becomes null),
  // we still have data to render the slide-down animation correctly,
  // preventing ghost modals from getting stuck.
  useEffect(() => {
    if (event) {
      setCachedEvent(event);
    }
  }, [event]);

  if (!cachedEvent) return null;

  const currentEvent = event || cachedEvent;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <UView className="bg-[#1A1A1A] w-full h-[85%] absolute bottom-0 rounded-t-3xl overflow-hidden">
          
          {/* Header with Close and Save/Verify placeholders based on reference style */}
          <UView className="flex-row justify-between items-center px-4 py-4 pt-6">
            <UPressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color="white" />
            </UPressable>
            
            <PrimaryButton 
                className="w-auto px-4 py-1.5 h-auto rounded-md min-w-[70px]" 
                textClassName="text-sm font-bold"
                onPress={onClose} 
            >
                Verify
            </PrimaryButton>
          </UView>

          {/* Empty Body as requested ("plain popup , dotn add anytjin g in there") */}
          <UScroll 
            className="flex-1 bg-[#1A1A1A] " 
            contentContainerStyle={{ paddingBottom: 0 }}
            showsVerticalScrollIndicator={false}
          >
            <UView className="px-6 flex-row justify-between items-start mt-2">
                <UView className="flex-1 mr-4">
                    <AuthHeading className="text-left text-3xl">
                        {currentEvent.title || "No Title"}
                    </AuthHeading>
                    <BodyText className="text-left text-gray-400 ">
                        {currentEvent.description || "No description provided"}
                    </BodyText>
                </UView>
                
                {/* Status Badge */}
                {currentEvent.status && (
                    <UView className={`px-3 py-1 rounded-full border ${
                        currentEvent.status === 'verified' ? 'bg-green-500/10 border-green-500/20' :
                        currentEvent.status === 'failed' ? 'bg-red-500/10 border-red-500/20' :
                        'bg-yellow-500/10 border-yellow-500/20'
                    }`}>
                        <BodyText className={`text-xs font-bold uppercase ${
                            currentEvent.status === 'verified' ? 'text-green-400' :
                            currentEvent.status === 'failed' ? 'text-red-400' :
                            'text-yellow-400'
                        }`}>
                            {currentEvent.status}
                        </BodyText>
                    </UView>
                )}
            </UView>
            {/* Time Section Container */}
            <UView className="border-t border-b border-white/20 mt-6 py-6 px-6">
                
                {/* 1. All Day Row */}
                <UView className="flex-row items-center mb-6">
                    <MaterialCommunityIcons name="clock-time-four-outline" size={24} color="#9CA3AF" style={{ marginRight: 16 }} />
                    <BodyText className="text-white text-lg flex-1">All-day</BodyText>
                    <UView className="w-10 h-6 bg-gray-600 rounded-full justify-center px-1">
                        <UView className="w-4 h-4 bg-gray-400 rounded-full" />
                    </UView>
                </UView>

                {/* 2. Start Time Row */}
                <UView className="flex-row justify-between mb-4 pl-10">
                    <BodyText className="text-white text-base">{dayjs(currentEvent.start).format('ddd, D MMM YYYY')}</BodyText>
                    <BodyText className="text-white text-base">{dayjs(currentEvent.start).format('h:mm a')}</BodyText>
                </UView>

                {/* 3. End Time Row */}
                <UView className="flex-row justify-between mb-6 pl-10">
                    <BodyText className="text-white text-base">{dayjs(currentEvent.end).format('ddd, D MMM YYYY')}</BodyText>
                    <BodyText className="text-white text-base">{dayjs(currentEvent.end).format('h:mm a')}</BodyText>
                </UView>

                {/* 4. Timezone Row */}
                <UView className="flex-row items-center">
                    <MaterialCommunityIcons name="earth" size={24} color="#9CA3AF" style={{ marginRight: 16 }} />
                    <BodyText className="text-gray-300 text-base">India Standard Time</BodyText>
                </UView>

            </UView>

            {/* --- GPS Location Display --- */}
            {/* 
                Calculates geo-fencing requirements ("within" or "outside" the radius)
                and securely renders a native Google Map component (Android only) 
                without web-view overhead.
            */}
            <LocationSection event={currentEvent} />
            
            {/* Penalty Section */}
            <PenaltySection event={currentEvent} />

            {/* Waiver Section */}
            <WaiverSection event={currentEvent} />
          </UScroll>

        </UView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
});
