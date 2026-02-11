import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, Switch, StyleSheet, Platform } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { GoogleMaps } from 'expo-maps';
import { BodyText, AuthHeading } from '@/components/ui/text';
import { PrimaryButton } from '@/components/ui/button';
import { useLocation } from '@/hooks/useLocation';

const UView = withUniwind(View);
const UTextInput = withUniwind(TextInput);
const UPressable = withUniwind(Pressable);

interface EventDetailModalProps {
  visible: boolean;
  onClose: () => void;
  event: any; // Using any for now to handle both mapping types
}

export function EventDetailModal({ visible, onClose, event }: EventDetailModalProps) {
  if (!event) return null;

  const { currentLocation, requestLocation } = useLocation();
  const [mapReady, setMapReady] = useState(false);

  // Extract location data
  const data = event.originalData || event;
  const locationCondition = data.conditions?.find((c: any) => c.metric_key === "location");
  const target = locationCondition?.target?.value;
  
  // Format location for map
  const mapRegion = target ? {
    latitude: target.lat,
    longitude: target.lng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : currentLocation ? {
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  useEffect(() => {
    // Request location on mount to show blue dot
    requestLocation();
  }, []);

  const start = dayjs(data.start?.dateTime || data.start);
  const end = dayjs(data.end?.dateTime || data.end);
  const title = data.title || "No Title";
  const color = data.color || "#4FA0FF";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <UView className="bg-[#1E1E1E] w-full h-[85%] absolute bottom-0 rounded-t-3xl overflow-hidden">
          
          {/* Header */}
          <UView className="flex-row justify-between items-center px-4 py-4 pt-6">
            <UPressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color="#D1D5DB" />
            </UPressable>
            
            <PrimaryButton 
                className="w-auto px-4 py-1.5 h-auto rounded-md min-w-[70px]" 
                textClassName="text-sm font-bold"
                onPress={onClose} 
            >
                Verify
            </PrimaryButton>
          </UView>

          {/* Content Scroll Container could go here if needed, using simple View for now */}
          <UView className="px-6 mt-2">
            
            {/* Title */}
            <AuthHeading className="text-left mb-6 font-normal">
                {title}
            </AuthHeading>

            {/* Type Toggle */}
            <UView className="flex-row mb-8">
                <UView className="bg-[#333333] px-6 py-2 rounded-lg mr-4">
                    <BodyText className="text-[#4FA0FF] font-medium">Event</BodyText>
                </UView>
                <UView className="px-6 py-2">
                    <BodyText className="text-gray-400 font-medium">Task</BodyText>
                </UView>
            </UView>

            {/* Time Section */}
            <UView className="mb-3">
                {/* All Day Row */}
                <UView className="flex-row items-center mb-6">
                    <MaterialCommunityIcons name="clock-outline" size={24} color="#9CA3AF" style={{ marginRight: 16 }} />
                    <BodyText className="flex-1">All day</BodyText>
                    <Switch 
                        value={false} 
                        trackColor={{ false: '#333', true: '#4FA0FF' }}
                        thumbColor="#f4f3f4"
                    />
                </UView>

                {/* Start Time */}
                <UView className="flex-row justify-between mb-4 pl-10">
                    <BodyText>Start</BodyText>
                    <BodyText>{start.format('ddd, MMM D   h:mm A')}</BodyText>
                </UView>

                {/* End Time */}
                <UView className="flex-row justify-between pl-10">
                    <BodyText>End</BodyText>
                    <BodyText>{end.format('ddd, MMM D   h:mm A')}</BodyText>
                </UView>
                
            </UView>

            {/* Location Section */}
            {/* Location Section */}
            <UView className="pt-6 border-t border-white/10 mt-2">
                <UView className="flex-row items-center mb-4">
                    <MaterialCommunityIcons name="map-marker-outline" size={24} color="#9CA3AF" style={{ marginRight: 16 }} />
                    <BodyText className="text-gray-400 flex-1">Location</BodyText>
                    <BodyText className={target ? "text-white flex-1 text-right" : "text-gray-500"}>
                        {target ? title : "Add location"}
                    </BodyText>
                </UView>

                {/* Map Preview (Android Only for now via GoogleMaps) */}
                {Platform.OS === 'android' && (target || currentLocation) && (
                    <UView className="h-40 w-full rounded-xl overflow-hidden bg-gray-800 mt-2">
                        <GoogleMaps.View
                            style={{ flex: 1 }}
                            mapOptions={{
                                mapId: "7702036af0cdf4aa60ff733d"
                            }}
                            cameraPosition={{
                                coordinates: {
                                    latitude: mapRegion.latitude,
                                    longitude: mapRegion.longitude
                                },
                                zoom: 17
                            }}
                            properties={{
                                isMyLocationEnabled: true,
                                mapType: "HYBRID"
                            }}
                            uiSettings={{
                                myLocationButtonEnabled: true,
                                zoomGesturesEnabled: true,
                                scrollGesturesEnabled: true,
                            }}
                            circles={target ? [{
                                center: {
                                    latitude: target.lat,
                                    longitude: target.lng,
                                },
                                radius: target.radius || 20,
                                color: "#4FA0FF40",
                                lineColor: "#4FA0FF",
                                lineWidth: 12,
                            }] : []}
                        />
                    </UView>
                )}
            </UView>

          </UView>
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
