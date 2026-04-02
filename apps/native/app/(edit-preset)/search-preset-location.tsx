import { useState, useEffect } from "react";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { withUniwind } from "uniwind";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Input } from "@/components/ui/input";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { HeaderTitle, FooterText } from "@/components/ui/text";
import { env } from "@commit/env/native";

import { usePresetEditStore } from "@/stores/usePresetEditStore";

const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);
const UScroll = withUniwind(ScrollView);

const GOOGLE_API_KEY = env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function SearchPresetLocationScreen() {
  const router = useRouter();
  const setLocation = usePresetEditStore((s) => s.setLocation);
  const currentRadius = usePresetEditStore((s) => s.radius);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query,
        )}&key=${GOOGLE_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === "OK") {
          setResults(data.predictions || []);
        } else {
          setResults([]);
        }
      } catch (error) {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = async (item: any) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}&key=${GOOGLE_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        const { lat, lng } = data.result.geometry.location;

        setLocation({
          latitude: lat,
          longitude: lng,
          address: item.description,
          radius: currentRadius,
        });

        setTimeout(() => {
          router.back();
        }, 50);
      }
    } catch (error) {
      console.error("[SearchPreset] Place details error:", error);
    }
  };

  return (
    <ScreenContainer className="bg-black">
      <UView className="flex-1">
        <UView className="flex-row items-center pt-4">
          <UButton
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full bg-[#1A1A1A]"
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#4FA0FF" />
          </UButton>

          <UView className="ml-3 flex-1">
            <Input
              placeholder="Search for a location"
              autoFocus
              value={query}
              onChangeText={setQuery}
              className="h-12 py-0 bg-[#1A1A1A]"
            />
          </UView>
        </UView>

        <UScroll className="mt-6 flex-1" showsVerticalScrollIndicator={false}>
          {results.map((item) => (
            <UButton
              key={item.place_id}
              onPress={() => handleSelect(item)}
              className="w-full mb-2 p-3 rounded-2xl active:bg-[#1A1A1A]"
              activeOpacity={0.5}
            >
              <HeaderTitle className="text-lg leading-tight">
                {item.structured_formatting.main_text}
              </HeaderTitle>
              <FooterText className="mt-1 text-base text-gray-400">
                {item.structured_formatting.secondary_text}
              </FooterText>
            </UButton>
          ))}
        </UScroll>
      </UView>
    </ScreenContainer>
  );
}
