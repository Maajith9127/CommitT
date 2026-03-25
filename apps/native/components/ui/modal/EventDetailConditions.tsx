import React, { useState, useEffect } from 'react';
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

/**
 * Renders the list of apps blocked by the digital commitment.
 * Uses the same row layout as Penalty/Waiver, but adds a horizontal icon list.
 */
export const BlocklistSection = ({ event }: { event: any }) => {
  const [resolvedApps, setResolvedApps] = useState<ResolvedApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Resolve application IDs from the commitment condition
  const blockCondition = event?.conditions?.find(
    (c: any) => c.metric_key === "digital_commitment"
  );
  
  const appIds: string[] = blockCondition?.target?.value?.apps || [];

  useEffect(() => {
    if (appIds.length === 0) {
      setIsLoading(false);
      return;
    }

    async function resolveMetadata() {
      setIsLoading(true);
      try {
        const allApps = await AppListerModule.getInstalledApps();
        const resolved = appIds.map(id => {
          const match = allApps.find(a => a.id === id);
          return {
            id,
            name: match?.name || id,
            icon: match?.iconBase64
          };
        });
        setResolvedApps(resolved);
      } catch (err) {
        console.error("[BlocklistSection] Metadata resolution failed:", err);
      } finally {
        setIsLoading(false);
      }
    }
    resolveMetadata();
  }, [appIds.join(',')]);

  if (!blockCondition || appIds.length === 0) return null;

  return (
    <UView className="border-b border-white/20 p-6">
      {/* HEADER ROW (Referencing Penalty/Waiver style) */}
      <UView className="flex-row items-center mb-5">
        <MaterialCommunityIcons name="cellphone-lock" size={28} color="#9CA3AF" style={{ marginRight: 16 }} />
        <UView className="flex-1">
          <BodyText className="text-white text-base">Digital Commitment</BodyText>
          <BodyText className="text-gray-400 text-sm mt-1">These apps are blocked</BodyText>
        </UView>
        <VerificationStatusCircle status="neutral" />
      </UView>

      {/* ICON GALLERY (Nested below for clean hierarchy) */}
      <UView className="pl-11">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', alignItems: 'center' }}
        >
          {isLoading ? (
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
                  <MaterialCommunityIcons name="apps" size={24} color="#4FA0FF" />
                )}
              </UView>
            ))
          )}
        </ScrollView>
      </UView>
    </UView>
  );
};
