/**
 * BaseDrawerModal
 * ─────────────────────────────────────────────────────────────────────────────
 * A production-ready, reusable slide-up drawer modal.
 *
 * This component owns ONLY the visual shell:
 *   • Semi-transparent backdrop overlay
 *   • Rounded-top container with dark background
 *   • Slide animation
 *   • Close-on-backdrop-tap behavior
 *
 * It accepts `children` for content — making it usable for:
 *   • EventDetailModal (task instance details)
 *   • Preset pickers (location/blocklist selection during commitment creation)
 *   • Any future full-screen bottom sheet
 *
 * IMPORTANT: This component does NOT own any data, state, or business logic.
 * It is a pure presentational container.
 */

import React from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { withUniwind } from 'uniwind';

const UView = withUniwind(View);
const UPressable = withUniwind(Pressable);

// ── Types ───────────────────────────────────────────────────────────────────

export interface BaseDrawerModalProps {
  /** Controls visibility of the modal */
  visible: boolean;
  /** Called when the user taps the backdrop or presses the hardware back button */
  onClose: () => void;
  /** Content to render inside the drawer */
  children: React.ReactNode;
  /** 
   * Height of the drawer as a percentage string (e.g. "95%", "60%").
   * Defaults to "95%" for full-screen drawers like EventDetailModal.
   */
  height?: string;
  /** Animation type for the modal transition. Defaults to "slide". */
  animationType?: 'slide' | 'fade' | 'none';
  /** If true, tapping the backdrop will NOT close the modal. Defaults to false. */
  disableBackdropClose?: boolean;
}

// ── Component ───────────────────────────────────────────────────────────────

export function BaseDrawerModal({
  visible,
  onClose,
  children,
  height = '95%',
  animationType = 'slide',
  disableBackdropClose = false,
}: BaseDrawerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop — tapping closes the modal (unless disabled) */}
        {!disableBackdropClose && (
          <UPressable
            className="absolute inset-0"
            onPress={onClose}
          />
        )}

        {/* Drawer Container */}
        <UView
          className="bg-[#1A1A1A] w-full absolute bottom-0 rounded-t-3xl overflow-hidden"
          style={{ height }}
        >
          {children}
        </UView>
      </View>
    </Modal>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
});
