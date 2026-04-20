import type { Id } from "@commit/backend/convex/_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Metadata for a device-installed application resolved from native */
export interface ResolvedApp {
  id: string;
  name: string;
  icon?: string;
}

/** Condition card configuration for the carousel */
export interface ConditionConfig {
  id: string;
  icon: string;
  title: string;
  route?: string;
}

/** Result from create/update mutations */
export interface MutationResult {
  success: boolean;
  taskId?: Id<"tasks">;
  instances?: Array<{
    _id: string;
    start: number;
    end: number;
    status: string;
    title: string;
    config: any;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

/** Modal state for error/confirmation dialogs */
export interface ModalState {
  visible: boolean;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Available condition types that users can configure */
export const CONDITION_CONFIGS: ConditionConfig[] = [
  { id: "time", icon: "clock-outline", title: "Time", route: "/(create-commit)/time-set" },
  { id: "location", icon: "map-marker-outline", title: "Location", route: "/(create-commit)/location-set" },
  { id: "partner", icon: "account-check-outline", title: "Partner", route: "/(create-commit)/partner-select" },
  { id: "picture", icon: "camera-outline", title: "Picture" },
  { id: "video", icon: "video-outline", title: "Video" },
] as const;

/** Layout constants for the condition card carousel */
export const LAYOUT = {
  horizontalPadding: 16,
  cardGap: 8,
  visibleCards: 3.2,
} as const;

/** App color palette */
export const COLORS = {
  primary: "#4FA0FF",
  danger: "#FF3B30",
  success: "#4CD964",
} as const;

/** Selection options for advanced settings */
export const SETTINGS_OPTIONS = {
  gracePeriod: [
    { label: "5 minutes", value: 5 },
    { label: "10 minutes", value: 10 },
    { label: "15 minutes", value: 15 },
    { label: "20 minutes", value: 20 },
    { label: "30 minutes", value: 30 },
  ],
  alarmLeadTime: [
    { label: "15 mins before", value: 15 },
    { label: "30 mins before", value: 30 },
    { label: "45 mins before", value: 45 },
    { label: "60 mins before", value: 60 },
  ],
  intensity: [
    { label: "Relaxed", value: "relaxed", description: "Fewer random check-ins during the interval" },
    { label: "Moderate", value: "moderate", description: "Standard amount of random check-ins" },
    { label: "Strict", value: "strict", description: "Frequent random check-ins during the interval" },
  ],
  maxMissedCheckins: [
    { label: "Zero Tolerance", value: 0, description: "Ultra Strict: Miss 1 and fail" },
    { label: "1 Missed Check-in", value: 1, description: "Strict: Room for one mistake" },
    { label: "2 Missed Check-ins", value: 2, description: "Moderate: Room for a couple of mistakes" },
    { label: "3 Missed Check-ins", value: 3, description: "Lenient: Fail only if you miss 3+" },
  ],
  alarmInterval: [
    { label: "Every 2 mins", value: 2 },
    { label: "Every 5 mins", value: 5 },
    { label: "Every 10 mins", value: 10 },
  ],
  alarmSound: [
    { label: "Default", value: "Default" },
    { label: "Calm", value: "Calm" },
    { label: "Energetic", value: "Energetic" },
    { label: "Warning", value: "Warning" },
  ],
  waiverDeadline: [
    { label: "1 hour", value: 60 },
    { label: "5 hours", value: 300 },
    { label: "10 hours", value: 600 },
    { label: "24 hours", value: 1440 },
    { label: "2 days", value: 2880 },
  ],
} as const;
