import { useMemo } from "react";
import type { SelectionOption } from "@/components/ui/modal/SelectionSheet";
import type { TaskDraft } from "@/stores/useTaskDraftStore";
import { SETTINGS_OPTIONS } from "./constants";

// ─────────────────────────────────────────────────────────────────────────────
// Settings Items Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the data-driven form schemas for the three settings sections
 * on the FinalScreen: Commitment Type, Alarms, and Waiver Rules.
 *
 * EXTRACTION RATIONALE:
 * These three useMemo blocks were the single largest non-JSX block in final.tsx,
 * totaling ~190 lines. Extracting them into a hook keeps final.tsx focused on
 * layout orchestration while this file owns the form schema logic.
 */
export function useSettingsItems(
  draft: TaskDraft,
  setConfig: (partial: Partial<TaskDraft["config"]>) => void,
  setDraft: (partial: Partial<TaskDraft>) => void,
  setPicker: (state: {
    visible: boolean;
    title: string;
    options: SelectionOption[];
    selectedValue: any;
    onSelect: (val: any) => void;
  }) => void,
) {
  /**
   * Represents the dynamic form schema for the "Commitment Type" section.
   * Handles toggle states and picker modal requests for Stay Throughout mode.
   */
  const commitmentSettingsItems = useMemo(() => [
    {
      id: "showUp",
      title: "Just Show Up",
      type: "toggle" as const,
      icon: "account-check-outline",
      value: draft.config.verification_style === "just_show_up",
      onValueChange: (v: boolean) => {
        if (v) setConfig({ verification_style: "just_show_up" });
      },
    },
    {
      id: "stayThroughout",
      title: "Stay Throughout",
      type: "toggle" as const,
      icon: "timer-sand",
      value: draft.config.verification_style === "stay_throughout",
      onValueChange: (v: boolean) => {
        if (v) {
          setConfig({ 
            verification_style: "stay_throughout",
            stay_throughout_config: draft.config.stay_throughout_config || {
              intensity: "relaxed",
              max_missed_checkins: 1,
            }
          });
        }
      },
    },
    {
      id: "intensity",
      title: "Check-In Intensity",
      type: "select" as const,
      icon: "speedometer",
      disabled: draft.config.verification_style !== "stay_throughout",
      selectValue: draft.config.verification_style === "stay_throughout" 
        ? (draft.config.stay_throughout_config?.intensity ? draft.config.stay_throughout_config.intensity.charAt(0).toUpperCase() + draft.config.stay_throughout_config.intensity.slice(1) : "Relaxed")
        : "N/A",
      onPress: () => {
        if (draft.config.verification_style !== "stay_throughout") return;
        setPicker({
          visible: true,
          title: "Check-in Intensity",
          options: SETTINGS_OPTIONS.intensity,
          selectedValue: draft.config.stay_throughout_config?.intensity ?? "relaxed",
          onSelect: (v) => setConfig({ 
            stay_throughout_config: { 
              ...(draft.config.stay_throughout_config || { max_missed_checkins: 1 }),
              intensity: v
            } 
          }),
        });
      }
    },
    {
      id: "maxMissedCheckins",
      title: "Max Missed Check-ins",
      type: "select" as const,
      icon: "alert-circle-outline",
      disabled: draft.config.verification_style !== "stay_throughout",
      selectValue: draft.config.verification_style === "stay_throughout" 
        ? `${draft.config.stay_throughout_config?.max_missed_checkins ?? 1}`
        : "N/A",
      onPress: () => {
        if (draft.config.verification_style !== "stay_throughout") return;
        setPicker({
          visible: true,
          title: "Allowed Misses",
          options: SETTINGS_OPTIONS.maxMissedCheckins,
          selectedValue: draft.config.stay_throughout_config?.max_missed_checkins ?? 1,
          onSelect: (v) => setConfig({ 
            stay_throughout_config: {
              ...(draft.config.stay_throughout_config || { intensity: "relaxed" }),
              max_missed_checkins: v
            } 
          }),
        });
      }
    },
    {
      id: "grace",
      title: "Grace Period",
      type: "select" as const,
      icon: "clock-fast",
      selectValue: `${draft.config.grace_period_minutes}m`,
      onPress: () => setPicker({
        visible: true,
        title: "Grace Period",
        options: SETTINGS_OPTIONS.gracePeriod,
        selectedValue: draft.config.grace_period_minutes,
        onSelect: (v) => setConfig({ grace_period_minutes: v }),
      })
    }
  ], [draft.config, setConfig]);

  /**
   * Represents the dynamic form schema for the "Alarms" section.
   */
  const alarmSettingsItems = useMemo(() => [
    {
      id: "alarmLeadTime",
      title: "Start Alarming",
      type: "select" as const,
      icon: "bell-ring-outline",
      selectValue: `-${draft.config.alarms.lead_time_minutes}m`,
      onPress: () => setPicker({
        visible: true,
        title: "Start Alarming",
        options: SETTINGS_OPTIONS.alarmLeadTime,
        selectedValue: draft.config.alarms.lead_time_minutes,
        onSelect: (v) => setConfig({ alarms: { lead_time_minutes: v } }),
      })
    },
    {
      id: "alarmInterval",
      title: "Alarm Frequency",
      type: "select" as const,
      icon: "update",
      selectValue: `${draft.config.alarms.interval_minutes}m`,
      onPress: () => setPicker({
        visible: true,
        title: "Alarm Frequency",
        options: SETTINGS_OPTIONS.alarmInterval,
        selectedValue: draft.config.alarms.interval_minutes,
        onSelect: (v) => setConfig({ alarms: { interval_minutes: v } }),
      })
    },
    {
      id: "alarmSound",
      title: "Alarm Music",
      type: "select" as const,
      icon: "music-note-outline",
      selectValue: draft.config.alarms.sound_key,
      onPress: () => setPicker({
        visible: true,
        title: "Alarm Music",
        options: SETTINGS_OPTIONS.alarmSound,
        selectedValue: draft.config.alarms.sound_key,
        onSelect: (v) => setConfig({ alarms: { sound_key: v } }),
      })
    }
  ], [draft.config.alarms, setConfig]);

  /**
   * Represents the dynamic form schema for the "Waiver Settings" section.
   */
  const waiverSettingsItems = useMemo(() => [
    {
      id: "waiverDeadline",
      title: "Waiver Deadline",
      type: "select" as const,
      icon: "calendar-clock-outline",
      selectValue: draft.penalty_waiver?.deadline_minutes 
        ? (draft.penalty_waiver.deadline_minutes >= 1440 
          ? `${Math.floor(draft.penalty_waiver.deadline_minutes / 1440)}d` 
          : `${Math.floor(draft.penalty_waiver.deadline_minutes / 60)}h`)
        : "Set deadline",
      onPress: () => setPicker({
        visible: true,
        title: "Waiver Deadline",
        options: SETTINGS_OPTIONS.waiverDeadline,
        selectedValue: draft.penalty_waiver?.deadline_minutes ?? 600,
        onSelect: (v) => setDraft({ 
          penalty_waiver: { 
            ...(draft.penalty_waiver || { type: "captcha", config: {} }), 
            deadline_minutes: v 
          } 
        }),
      })
    },
    {
      id: "allowEarlyWaiver",
      title: "Allow Early Waiver",
      type: "toggle" as const,
      icon: "fast-forward-outline",
      value: draft.penalty_waiver?.config?.allow_early ?? false,
      onValueChange: (v: boolean) => setDraft({
        penalty_waiver: {
          ...(draft.penalty_waiver || { type: "captcha", config: {}, deadline_minutes: 600 }),
          config: {
            ...(draft.penalty_waiver?.config || {}),
            allow_early: v
          }
        }
      })
    }
  ], [draft.penalty_waiver, setDraft]);

  return { commitmentSettingsItems, alarmSettingsItems, waiverSettingsItems };
}
