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

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);
const UScroll = withUniwind(ScrollView);

const GOOGLE_API_KEY = env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SearchPresetLocationScreen
 *
 * A Google Places Autocomplete search page dedicated to the preset editing flow.
 * Architecturally identical to `searchpac.tsx`, but writes to `usePresetEditStore`
 * instead of `useTaskDraftStore`. This ensures zero side effects on the active
 * commitment creation draft.
 *
 * FLOW:
 *   1. User types a place name → Google Autocomplete returns suggestions.
 *   2. User taps a result → Place Details API resolves lat/lng.
 *   3. Store is updated → navigates back to edit-location-preset.
 *   4. The edit page reads the updated store and flies the camera to the new pin.
 */
export default function SearchPresetLocationScreen() {
  const router = useRouter();
  const setLocation = usePresetEditStore((s) => s.setLocation);
  const currentRadius = usePresetEditStore((s) => s.radius);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);

  // ── Debounced Google Places Autocomplete ──
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
          console.log("[SearchPreset] Google API Error:", data.status);
          setResults([]);
        }
      } catch (error) {
        console.error("[SearchPreset] Fetch error:", error);
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // ── Place Selection Handler ──
  const handleSelect = async (item: any) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}&key=${GOOGLE_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK") {
        const { lat, lng } = data.result.geometry.location;

        // Write to the preset edit store (NOT useTaskDraftStore)
        setLocation({
          latitude: lat,
          longitude: lng,
          address: item.description,
          radius: currentRadius,
        });

        // Brief delay for visual feedback before navigating back
        setTimeout(() => {
          router.back();
        }, 50);
      }
    } catch (error) {
      console.error("[SearchPreset] Place details error:", error);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ScreenContainer className="bg-black">
      <UView className="flex-1">

        {/* ── Search Bar Row ── */}
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

        {/* ── Results List ── */}
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
