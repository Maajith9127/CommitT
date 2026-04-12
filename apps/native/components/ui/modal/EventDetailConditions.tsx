import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, Image } from 'react-native';
import { withUniwind } from 'uniwind';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BodyText, FooterText } from '@/components/ui/text';
import { AppListerModule } from '@/modules/app-lister-module';
import { HorizontalAppSkeleton } from '@/components/ui/skeletons/HorizontalAppSkeleton';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  useSharedValue 
} from 'react-native-reanimated';

const UView = withUniwind(View);

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DOMAIN MAPS (MOCK DATA / UI CONFIG)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps penalty keys from the backend database to their respective UI representations.
 * Used to dynamically render the correct icon, title, and description.
 */
/**
 * Maps penalty types from the backend to their respective UI representations.
 */
export const PENALTY_MAP: Record<string, { icon: any; title: string; subtitle: string; color: string }> = {
  send_money: { 
    icon: 'currency-inr', 
    title: 'Money Penalty', 
    subtitle: 'Lose a fixed amount when you miss',
    color: '#FF3B30'
  },
  embarrassing_photo: { 
    icon: 'camera-enhance-outline', 
    title: 'Embarrassing Photo', 
    subtitle: 'Send a cringe picture to a channel',
    color: '#FF9500'
  },
  send_email: { 
    icon: 'email-outline', 
    title: 'Shame Email', 
    subtitle: 'Send an automated shame email to recipients',
    color: '#FF3B30'
  },
  commit_direct: { 
    icon: 'account-alert-outline', 
    title: 'Direct Shame', 
    subtitle: 'Send penalty content to another Commit user',
    color: '#AF52DE'
  },
};

/**
 * Maps waiver types from the backend database to their respective UI representations.
 */
export const WAIVER_MAP: Record<string, { icon: any; title: string; subtitle: string; color: string }> = {
  captcha: { 
    icon: 'shield-check-outline', 
    title: 'Solve CAPTCHAs', 
    subtitle: 'Solve a set number of CAPTCHAs to waive off penalty',
    color: '#4CD964'
  },
  paragraph: { 
    icon: 'pencil-outline', 
    title: 'Type Paragraph', 
    subtitle: 'Accurately type a long paragraph to avoid penalty',
    color: '#4CD964'
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MODULAR SUB-COMPONENTS
import { VerificationStatusCircle } from '@/components/ui/commits/VerificationStatusCircle';

/**
 * A small pulsing badge that shows time remaining for a waiver.
 */
const CountdownPill = ({ expiresAt }: { expiresAt: number }) => {
  const [timeLeft, setTimeLeft] = useState(expiresAt - Date.now());
  const opacity = useSharedValue(1);

  useEffect(() => {
    const timer = setInterval(() => {
      const nextTime = expiresAt - Date.now();
      setTimeLeft(nextTime);
      if (nextTime <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  useEffect(() => {
    // Pulse faster if less than 5 minutes remain
    if (timeLeft < 300000 && timeLeft > 0) {
      opacity.value = withRepeat(
        withSequence(withTiming(0.4, { duration: 400 }), withTiming(1, { duration: 400 })),
        -1,
        true
      );
    } else {
      opacity.value = 1;
    }
  }, [timeLeft]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (timeLeft <= 0) return null;

  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);
  const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const isUrgent = timeLeft < 300000;

  return (
    <Animated.View 
      style={[
        animatedStyle, 
        { 
          backgroundColor: isUrgent ? 'rgba(255, 59, 48, 0.2)' : 'rgba(79, 160, 255, 0.2)',
          borderWidth: 1,
          borderColor: isUrgent ? '#FF3B30' : '#4FA0FF',
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 8,
          marginLeft: 8,
          flexDirection: 'row',
          alignItems: 'center'
        }
      ]}
    >
      <MaterialCommunityIcons 
        name="clock-outline" 
        size={10} 
        color={isUrgent ? '#FF3B30' : '#4FA0FF'} 
        style={{ marginRight: 4 }} 
      />
      <BodyText style={{ color: isUrgent ? '#FF3B30' : '#4FA0FF', fontSize: 10, fontWeight: 'bold' }}>
        {timeStr}
      </BodyText>
    </Animated.View>
  );
};

/**
 * Generic blueprint for rendering a condition row (used by Penalty and Waiver sections)
 */
export const InfoSection = ({ 
  icon, 
  color, 
  title, 
  subtitle, 
  status = 'neutral', 
  percentage,
  ratio,
  thumbnailUrl,
  expiresAt,
  onPress
}: { 
  icon: any; 
  color: string; 
  title: string; 
  subtitle: string; 
  status?: any; 
  percentage?: number;
  ratio?: { current: number; total: number };
  thumbnailUrl?: string;
  expiresAt?: number;
  onPress?: () => void;
}) => (
  <UView className="border-b border-white/20 flex-row p-6 items-center">
    <MaterialCommunityIcons name={icon} size={28} color={color} style={{ marginRight: 16 }} />
    <UView className="flex-1 mr-4 overflow-hidden">
      <View className="flex-row items-center">
        <BodyText className="text-white text-base">{title}</BodyText>
        {expiresAt && <CountdownPill expiresAt={expiresAt} />}
      </View>
      <BodyText className="text-gray-400 text-sm mt-1">{subtitle}</BodyText>
    </UView>
    <VerificationStatusCircle 
      status={status} 
      percentage={percentage} 
      ratio={ratio}
      thumbnailUrl={thumbnailUrl} 
      onPress={onPress} 
    />
  </UView>
);

/**
 * Renders the penalty information if configured.
 */
export const PenaltySection = ({ event }: { event: any }) => {
  const penalty = event?.penalty;
  if (!penalty) return null;

  const info = PENALTY_MAP[penalty.type] || {
    icon: 'alert-circle-outline',
    title: 'Penalty Configured',
    subtitle: 'Penalty rules applied to this task',
    color: '#FF3B30'
  };

  //  DYNAMIC SUBTITLE LOGIC:
  // We extract specific details from the config to make the penalty "scary" and clear.
  let dynamicSubtitle = info.subtitle;
  
  if (penalty.config) {
    const { channel, emailTo, recipients } = penalty.config;
    const channelName = channel ? channel.charAt(0).toUpperCase() + channel.slice(1) : '';

    if (penalty.type === 'embarrassing_photo') {
      if (channel === 'email' && emailTo) {
        dynamicSubtitle = `Photo will be sent to ${emailTo}`;
      } else if (channel) {
        dynamicSubtitle = `Photo will be sent via ${channelName}`;
      }
    } else if (penalty.type === 'send_email') {
      const target = Array.isArray(recipients) ? recipients[0] : recipients;
      if (target) dynamicSubtitle = `Shame email will be sent to ${target}`;
    } else if (channel) {
      dynamicSubtitle = `${info.subtitle} via ${channelName}`;
    }
  }

  // Determine the status icon based on the overall event status
  let status: any = 'neutral';
  if (event.status === 'penalized') status = 'failed';
  if (event.status === 'waived') status = 'waived';

  return (
    <InfoSection 
      icon={info.icon} 
      color="#FF3B30" // Forced Red for all Penalties
      title={info.title} 
      subtitle={dynamicSubtitle} 
      status={status}
      thumbnailUrl={penalty.type === 'embarrassing_photo' ? penalty.config?.photoUrl : undefined}
    />
  );
};

/**
 * Renders the waiver information if configured.
 */
export const WaiverSection = ({ event, onPress }: { event: any; onPress?: () => void }) => {
  const waiver = event?.penalty_waiver;
  if (!waiver) return null;

  const info = WAIVER_MAP[waiver.type] || {
    icon: 'shield-outline',
    title: 'Waiver Active',
    subtitle: 'Waiver rules available for this task',
    color: '#4CD964'
  };

  //  DYNAMIC SUBTITLE LOGIC:
  // We use the live configuration to tell the user exactly what to do.
  let dynamicSubtitle = info.subtitle;
  if (waiver.type === 'captcha' && waiver.config?.count) {
    dynamicSubtitle = `Solve ${waiver.config.count} CAPTCHAs to waive off penalty`;
  } else if (waiver.type === 'paragraph' && waiver.config?.wordCount) {
    dynamicSubtitle = `Type a ${waiver.config.wordCount} word paragraph to avoid penalty`;
  }

  // Determine status based on waiver outcome
  let status: any = 'neutral';
  if (event.status === 'waived') status = 'verified';
  if (event.status === 'waiver_active') status = 'pointer'; 

  // Pull live progress from waiver_state if active
  const ratio = event.waiver_state?.progress;
  const expiresAt = event.waiver_state?.expires_at;

  return (
    <InfoSection 
      icon={info.icon} 
      color={info.color} 
      title={info.title} 
      subtitle={dynamicSubtitle} 
      status={status}
      onPress={onPress}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOCKLIST SECTION
// ─────────────────────────────────────────────────────────────────────────────

type ResolvedApp = {
  id: string;
  name: string;
  icon?: string;
};

import { useAppStore } from '@/stores/useAppStore';

/**
 * BlocklistSection — Premium Implementation
 * ═══════════════════════════════════════════════
 * 
 * Performance Optimized: Uses the global `useAppStore` to resolve app metadata (icons/names) 
 * instantly from our pre-hydrated cache. This eliminates the 1-3 second delay previously 
 * caused by querying the Android PackageManager on every mount.
 * 
 * Memory Efficient: Loads apps using native `iconUri` (file path) rather than Base64 strings,
 * ensuring zero OOM (Out Of Memory) risk during long scroll sessions or complex modals.
 */
export const BlocklistSection = ({ event, onPress }: { event: any; onPress?: () => void }) => {
  // 1. Subscribe to the global device app catalog
  const discoveredApps = useAppStore((s: any) => s.apps);

  // 2. Extract application IDs from the commitment condition
  const blockCondition = event?.conditions?.find(
    (c: any) => c.metric_key === "digital_commitment"
  );
  
  const appIds: string[] = blockCondition?.target?.value?.apps || [];
  const isLoadingStore = discoveredApps.length === 0;

  // 3. Resolve metadata reactively based on the store
  const resolvedApps = useMemo(() => {
    return appIds.map(id => {
      const match = discoveredApps.find((a: any) => a.id === id);
      return {
        id,
        name: match?.name || id,
        icon: match?.iconUri // Uses file:// PNG path for high performance
      };
    });
  }, [appIds.join(','), discoveredApps]);

  // Hide section if no apps are blocked
  if (!blockCondition || appIds.length === 0) return null;

  return (
    <UView className="border-b border-white/20 p-6">
      {/* ── HEADER ROW ── */}
      <UView className="flex-row items-center mb-5">
        <MaterialCommunityIcons name="cellphone-lock" size={28} color="#9CA3AF" style={{ marginRight: 16 }} />
        <UView className="flex-1">
          <BodyText className="text-white text-base">Digital Commitment</BodyText>
          <BodyText className="text-gray-400 text-sm mt-1">These apps are blocked</BodyText>
        </UView>
        <VerificationStatusCircle 
          status="neutral" 
          onPress={onPress}
        />
      </UView>

      {/* ── ICON GALLERY ── */}
      <UView className="pl-11">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', alignItems: 'center' }}
        >
          {isLoadingStore ? (
            /* Show skeletons if the background sync is still running */
            <>
              <HorizontalAppSkeleton />
              <HorizontalAppSkeleton />
            </>
          ) : (
            resolvedApps.map((app) => (
              <UView key={app.id} className="mr-5">
                {app.icon ? (
                  <Image
                    source={{ uri: app.icon }}
                    style={{ width: 32, height: 32, borderRadius: 8 }}
                  />
                ) : (
                  /* Fallback icon if app was uninstalled but remains in history */
                  <MaterialCommunityIcons name="apps" size={24} color="#666" />
                )}
              </UView>
            ))
          )}
        </ScrollView>
      </UView>
    </UView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG SECTION — Behavioral DNA Layer
// ─────────────────────────────────────────────────────────────────────────────
// Renders the commitment's underlying operational configuration (verification 
// style, alarm schedule, and grace period) as a distinct set of rows.
//
// DESIGN PHILOSOPHY:
//   This section surfaces the "Protocol" or "DNA" of the commitment. By using 
//   a horizontal 'Label-Right-Value-Left' pattern, we maintain high density 
//   without vertical clutter. 
//
// ALIGNMENT NOTE:
//   All icons are set to size 30 with a 12px margin. This satisfies the 42px 
//   standardized left-column "Slot" established by the Hero UI, 
//   ensuring perfect vertical alignment across components.
// ─────────────────────────────────────────────────────────────────────────────

export const ConfigSection = ({ event }: { event: any }) => {
  const config = event?.config;
  if (!config) return null;

  const verificationStyle = config.verification_style;
  const alarms = config.alarms;
  const graceMinutes = config.grace_period_minutes ?? 0;

  // If there's literally nothing to show, hide the entire section
  if (!verificationStyle && !alarms && graceMinutes === 0) return null;

  return (
    <UView className="p-6 border-b border-white/20">
      {/* Verification Type */}
      {verificationStyle && (
        <UView className="flex-row items-center justify-between mb-6">
          <UView className="flex-row items-center flex-1">
            <MaterialCommunityIcons
              name={verificationStyle === 'stay_throughout' ? 'repeat' : 'bullseye-arrow'}
              size={30}
              color="#9CA3AF"
              style={{ marginRight: 12 }}
            />
            <BodyText className="text-gray-300 text-base">Type</BodyText>
          </UView>
          <BodyText className="text-white text-base">
            {verificationStyle === 'stay_throughout'
              ? 'Stay Throughout'
              : verificationStyle === 'just_show_up'
                ? 'Just Show Up'
                : verificationStyle.replace(/_/g, ' ')}
          </BodyText>
        </UView>
      )}

      {/* Grace Period */}
      {graceMinutes > 0 && (
        <UView className="flex-row items-center justify-between mb-6">
          <UView className="flex-row items-center flex-1">
            <MaterialCommunityIcons
              name="timer-sand"
              size={30}
              color="#9CA3AF"
              style={{ marginRight: 12 }}
            />
            <BodyText className="text-gray-300 text-base">Grace</BodyText>
          </UView>
          <BodyText className="text-white text-base">
            {graceMinutes}m buffer
          </BodyText>
        </UView>
      )}

      {/* Alarm Schedule */}
      {alarms && (
        <UView className="flex-row items-center justify-between mb-2">
          <UView className="flex-row items-center flex-1">
            <MaterialCommunityIcons
              name="alarm"
              size={30}
              color="#9CA3AF"
              style={{ marginRight: 12 }}
            />
            <BodyText className="text-gray-300 text-base">Alarm</BodyText>
          </UView>
          <BodyText className="text-white text-base">
            Every {alarms.interval_minutes}m • {alarms.lead_time_minutes}m lead
          </BodyText>
        </UView>
      )}
    </UView>
  );
};
