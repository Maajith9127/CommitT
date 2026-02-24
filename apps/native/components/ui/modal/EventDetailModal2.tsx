import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Modal, View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/ui/button';
import { AuthHeading, BodyText } from '@/components/ui/text';
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';
import { useCalendarStore } from '@/stores/useCalendarStore';
import { useQuery } from 'convex/react';
import { api } from '@commit/backend/convex/_generated/api';
import dayjs from 'dayjs';

const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);
const UScroll = withUniwind(ScrollView);

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON GUARD
// Module-level flag ensures only ONE instance ever renders the <Modal>.
// If Expo Router mounts (main)/_layout twice during transitions, the
// second instance sees isInstanceMounted=true and returns null.
// ─────────────────────────────────────────────────────────────────────────────
let isInstanceMounted = false;

// ─────────────────────────────────────────────────────────────────────────────
// EventDetailModal2 — "Always Mounted, Never Unmount" + Singleton Pattern
// ─────────────────────────────────────────────────────────────────────────────

export const EventDetailModal2 = React.memo(function EventDetailModal2() {
  // ── Singleton Guard ──
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!isInstanceMounted) {
      isInstanceMounted = true;
      setIsOwner(true);
      console.log("🔴 [Modal2] ===== CLAIMED OWNERSHIP (singleton) =====");
    } else {
      console.log("🔴 [Modal2] ⛔ DUPLICATE detected — will not render");
    }
    return () => {
      if (isInstanceMounted) {
        isInstanceMounted = false;
        console.log("🔴 [Modal2] ===== RELEASED OWNERSHIP =====");
      }
    };
  }, []);

  // ── ALL hooks called unconditionally (Rules of Hooks!) ──
  const eventId = useCalendarStore((state) => state.selectedEventId);
  const setSelectedEventId = useCalendarStore((state) => state.setSelectedEventId);

  const isVisible = !!eventId;

  const event = useQuery(
    api.api.instances.read.get,
    eventId ? { id: eventId as any } : "skip"
  );

  const handleClose = useCallback(() => {
    setSelectedEventId(null);
  }, [setSelectedEventId]);

  // ── Debug logging ──
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`🔴 [Modal2] RENDER #${renderCount.current} | owner=${isOwner} | visible=${isVisible} | eventId=${eventId || 'null'} | hasData=${!!event}`);

  // ── Singleton guard: duplicate instance → render nothing ──
  if (!isOwner) return null;

  // ── Only the owner renders the Modal shell ──
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <UView className="bg-[#1A1A1A] w-full h-[95%] absolute bottom-0 rounded-t-3xl overflow-hidden">
          
          {/* Header with Close and Verify */}
          <UView className="flex-row justify-between items-center px-4 py-4 pt-6">
            <UPressable onPress={handleClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={24} color="white" />
            </UPressable>
            
            <PrimaryButton 
                className="w-auto px-4 py-1.5 h-auto rounded-md min-w-[70px]" 
                textClassName="text-sm font-bold"
                onPress={() => {}} 
                disabled={false}
            >
                Verify
            </PrimaryButton>
          </UView>

          {/* Scrollable Content Area */}
          <UScroll 
            className="flex-1 bg-[#1A1A1A]" 
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Title + Description */}
            <UView className="px-6 flex-row justify-between items-start mt-2">
                <UView className="flex-1 mr-4">
                    <AuthHeading className="text-left text-3xl">
                        {event?.title || "—"}
                    </AuthHeading>
                    <BodyText className="text-left text-gray-400">
                        {event?.description || "—"}
                    </BodyText>
                </UView>

                {/* Status Badge */}
                {event?.status && (
                    <UView className={`px-3 py-1 rounded-full border ${
                        event.status === 'verified' ? 'bg-green-500/10 border-green-500/20' :
                        event.status === 'failed' ? 'bg-red-500/10 border-red-500/20' :
                        'bg-yellow-500/10 border-yellow-500/20'
                    }`}>
                        <BodyText className={`text-xs font-bold uppercase ${
                            event.status === 'verified' ? 'text-green-400' :
                            event.status === 'failed' ? 'text-red-400' :
                            'text-yellow-400'
                        }`}>
                            {event.status}
                        </BodyText>
                    </UView>
                )}
            </UView>

            {/* Time Section */}
            <UView className="border-t border-b border-white/20 mt-6 py-6 px-6">
                
                {/* All Day Row */}
                <UView className="flex-row items-center mb-6">
                    <MaterialCommunityIcons name="clock-time-four-outline" size={28} color="#9CA3AF" style={{ marginRight: 16 }} />
                    <UView className="flex-1 mr-4 overflow-hidden">
                        <BodyText className="text-white text-base">All-day</BodyText>
                    </UView>
                    <VerificationStatusCircle status={event?.status === 'verified' ? 'verified' : undefined} />
                </UView>

                {/* Start Time Row */}
                <UView className="flex-row justify-between mb-4 pl-10">
                    <BodyText className="text-white text-base">
                        {event?.start ? dayjs(event.start).format('ddd, D MMM YYYY') : '—'}
                    </BodyText>
                    <BodyText className="text-white text-base">
                        {event?.start ? dayjs(event.start).format('h:mm a') : '—'}
                    </BodyText>
                </UView>

                {/* End Time Row */}
                <UView className="flex-row justify-between mb-6 pl-10">
                    <BodyText className="text-white text-base">
                        {event?.end ? dayjs(event.end).format('ddd, D MMM YYYY') : '—'}
                    </BodyText>
                    <BodyText className="text-white text-base">
                        {event?.end ? dayjs(event.end).format('h:mm a') : '—'}
                    </BodyText>
                </UView>

                {/* Timezone Row */}
                <UView className="flex-row items-center">
                    <MaterialCommunityIcons name="earth" size={24} color="#9CA3AF" style={{ marginRight: 16 }} />
                    <BodyText className="text-gray-300 text-base">India Standard Time</BodyText>
                </UView>

            </UView>

            {/* Location / Penalty / Waiver sections — to be added */}

          </UScroll>

        </UView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
});
