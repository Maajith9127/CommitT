/**
 * TimePicker Component
 *
 * Modal for selecting a time range (FROM and TO).
 * Displays scrollable hour, minute, and period (AM/PM) pickers.
 *
 * Features:
 * - Tab switching between FROM and TO times
 * - 12-hour format with AM/PM
 * - 5-minute intervals for minutes
 * - Callback-based design for flexibility
 *
 * @example
 * <TimePicker
 *   visible={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onSave={(from, to) => handleSave(from, to)}
 * />
 */

import React, { useState, useCallback } from "react";
import { Modal, Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { withUniwind } from "uniwind";
import { THEME } from "@/constants/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Styled Components
// ─────────────────────────────────────────────────────────────────────────────

const UView = withUniwind(View);
const UText = withUniwind(Text);
const UScroll = withUniwind(ScrollView);

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** App brand color */
const ACCENT_COLOR = THEME.colors.primary;

/** Background colors */
const COLORS = {
  background: THEME.colors.surface,
  tabInactive: THEME.colors.surface,
  pressed: THEME.colors.surfaceElevated,
  overlay: "rgba(0,0,0,0.7)",
} as const;

/** Available hours (1-12) */
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

/** Available minutes (0, 5, 10, ... 55) */
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TimePeriod = "AM" | "PM";

type TimeValue = {
  hour: number;
  minute: number;
  period: TimePeriod;
};

type ActiveTab = "FROM" | "TO";

type Props = {
  /** Whether the picker modal is visible */
  visible: boolean;
  /** Callback when modal is closed without saving */
  onClose: () => void;
  /** Callback when user saves the time range */
  onSave: (from: TimeValue, to: TimeValue) => void;
  /** Optional: Initial 'FROM' state for surgical edits */
  initialFrom?: TimeValue;
  /** Optional: Initial 'TO' state for surgical edits */
  initialTo?: TimeValue;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────────────────

type PickerItemProps = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
};

/**
 * Individual selectable item in a picker column.
 * Extracted to reduce code duplication.
 */
function PickerItem({ label, isSelected, onPress }: PickerItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        marginHorizontal: 8,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: isSelected ? ACCENT_COLOR : pressed ? COLORS.pressed : "transparent",
      })}
    >
      <UText
        className="text-center text-lg"
        style={{
          fontWeight: isSelected ? "bold" : "normal",
          color: isSelected ? THEME.colors.textMain : THEME.colors.textMuted
        }}
      >
        {label}
      </UText>
    </Pressable>
  );
}

type TabButtonProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
};

/**
 * Tab button for switching between FROM and TO.
 */
function TabButton({ label, isActive, onPress }: TabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: 16,
        backgroundColor: isActive ? ACCENT_COLOR : pressed ? "#444" : COLORS.tabInactive,
      })}
    >
      <UText
        className="text-center text-lg"
        style={{
          fontWeight: "bold",
          color: isActive ? THEME.colors.textMain : THEME.colors.textMuted
        }}
      >
        {label}
      </UText>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function TimePicker({ visible, onClose, onSave, initialFrom, initialTo }: Props) {
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<ActiveTab>("FROM");
  
  // Using objects for cleaner state management
  const [fromTime, setFromTime] = useState<TimeValue>(initialFrom || {
    hour: 6,
    minute: 0,
    period: "AM",
  });
  
  const [toTime, setToTime] = useState<TimeValue>(initialTo || {
    hour: 8,
    minute: 0,
    period: "AM",
  });

  // REACTIVE STATE HYDRATION: Synchronize internal state when modal opens
  // with new initial manifests (crucial for swapping between edit vs add).
  React.useEffect(() => {
    if (visible) {
      setFromTime(initialFrom || { hour: 6, minute: 0, period: "AM" });
      setToTime(initialTo || { hour: 8, minute: 0, period: "AM" });
      setActiveTab("FROM");
    }
  }, [visible, initialFrom, initialTo]);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived State
  // ─────────────────────────────────────────────────────────────────────────

  const currentTime = activeTab === "FROM" ? fromTime : toTime;
  const setCurrentTime = activeTab === "FROM" ? setFromTime : setToTime;

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Update a single field of the current time.
   */
  const updateTimeField = useCallback(
    <K extends keyof TimeValue>(field: K, value: TimeValue[K]) => {
      setCurrentTime((prev) => ({ ...prev, [field]: value }));
    },
    [setCurrentTime]
  );

  /**
   * Handle save button press.
   */
  const handleSave = useCallback(() => {
    onSave(fromTime, toTime);
    onClose();
  }, [fromTime, toTime, onSave, onClose]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Format minute for display (e.g., 5 → "05").
   */
  const formatMinute = (m: number): string => String(m).padStart(2, "0");

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Picker Card */}
        <UView className="w-[85%] overflow-hidden rounded-2xl shadow-2xl" style={{ backgroundColor: THEME.colors.surface }}>
          
          {/* Tab Bar */}
          <UView className="flex-row">
            <TabButton
              label="FROM"
              isActive={activeTab === "FROM"}
              onPress={() => setActiveTab("FROM")}
            />
            <TabButton
              label="TO"
              isActive={activeTab === "TO"}
              onPress={() => setActiveTab("TO")}
            />
          </UView>

          {/* Time Display */}
          <UView className="items-center py-8" style={{ backgroundColor: THEME.colors.primary }}>
            <UText className="font-light text-6xl" style={{ color: THEME.colors.textMain }}>
              {currentTime.hour}:{formatMinute(currentTime.minute)}{" "}
              <UText className="text-4xl" style={{ color: THEME.colors.textMain, opacity: 0.7 }}>{currentTime.period}</UText>
            </UText>
          </UView>

          {/* Picker Columns */}
          <UView className="flex-row px-2 py-4" style={{ backgroundColor: THEME.colors.surface }}>
            
            {/* Hour Picker */}
            <UView className="flex-1 items-center">
              <UText className="mb-2 font-semibold text-xs" style={{ color: THEME.colors.textMuted }}>HOUR</UText>
              <UScroll className="h-40" showsVerticalScrollIndicator={false}>
                {HOURS.map((h) => (
                  <PickerItem
                    key={h}
                    label={String(h)}
                    isSelected={h === currentTime.hour}
                    onPress={() => updateTimeField("hour", h)}
                  />
                ))}
              </UScroll>
            </UView>

            {/* Minute Picker */}
            <UView className="flex-1 items-center">
              <UText className="mb-2 font-semibold text-xs" style={{ color: THEME.colors.textMuted }}>MINUTE</UText>
              <UScroll className="h-40" showsVerticalScrollIndicator={false}>
                {MINUTES.map((m) => (
                  <PickerItem
                    key={m}
                    label={formatMinute(m)}
                    isSelected={m === currentTime.minute}
                    onPress={() => updateTimeField("minute", m)}
                  />
                ))}
              </UScroll>
            </UView>

            {/* Period Picker (AM/PM) */}
            <UView className="flex-1 items-center">
              <UText className="mb-2 font-semibold text-xs" style={{ color: THEME.colors.textMuted }}>PERIOD</UText>
              <UView className="h-40 justify-center">
                <View style={{ marginBottom: 12 }}>
                  <PickerItem
                    label="AM"
                    isSelected={currentTime.period === "AM"}
                    onPress={() => updateTimeField("period", "AM")}
                  />
                </View>
                <PickerItem
                  label="PM"
                  isSelected={currentTime.period === "PM"}
                  onPress={() => updateTimeField("period", "PM")}
                />
              </UView>
            </UView>
          </UView>

          {/* Footer Buttons */}
          <UView className="flex-row justify-end border-t px-6 py-4" style={{ backgroundColor: THEME.colors.surface, borderColor: THEME.colors.surfaceElevated }}>
            <Pressable
              onPress={onClose}
              style={styles.footerButton}
            >
              <UText className="font-semibold text-base" style={{ color: THEME.colors.textMuted }}>CANCEL</UText>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.footerButton, { marginLeft: 16 }]}
            >
              <UText className="font-semibold text-base" style={{ color: THEME.colors.primary }}>OK</UText>
            </Pressable>
          </UView>
        </UView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.overlay,
  },
  footerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
