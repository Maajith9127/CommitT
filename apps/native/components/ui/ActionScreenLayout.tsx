import React from "react";
import { View, ScrollView } from "react-native";
import { withUniwind } from "uniwind";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

/**
 * Props for the ActionScreenLayout component.
 *
 * All three zones (header, children, footer) automatically receive the same
 * `paddingHorizontal` value, guaranteeing pixel-perfect alignment across
 * the fixed and scrollable areas without manual style duplication.
 */
type ActionScreenLayoutProps = {
  /** The scrollable main content of the screen. */
  children: React.ReactNode;
  /** Optional fixed header that stays pinned at the top (e.g. title, tabs, search bar).
   *  Does NOT scroll with the content — ideal for navigation chrome. */
  header?: React.ReactNode;
  /** Optional fixed footer pinned at the bottom (e.g. Save/Submit button).
   *  Stays visible regardless of scroll position. */
  footer?: React.ReactNode;
  /** Horizontal padding applied consistently to header, scroll area, and footer.
   *  @default 16 */
  paddingHorizontal?: number;
  /** Additional Tailwind classes for the outermost container. */
  className?: string;
  /** Additional Tailwind classes for the ScrollView wrapper. */
  scrollClassName?: string;
  /** Additional Tailwind classes for the footer wrapper. */
  footerClassName?: string;
};

/**
 * ActionScreenLayout — Universal 3-Zone Screen Layout
 *
 * Provides a standardized screen structure used across the app:
 *
 * ┌─────────────────────────────┐
 * │  HEADER (fixed, optional)   │  ← Titles, tabs, search bars
 * ├─────────────────────────────┤
 * │                             │
 * │  SCROLLABLE CONTENT         │  ← Lists, cards, forms (children)
 * │  (flex-1, takes all space)  │
 * │                             │
 * ├─────────────────────────────┤
 * │  FOOTER (fixed, optional)   │  ← Action buttons (Save, Submit)
 * └─────────────────────────────┘
 *
 * KEY DESIGN DECISIONS:
 *   - `paddingHorizontal` is applied via `style` (not className) to all 3 zones,
 *     ensuring the header text, scrollable list items, and footer button are
 *     perfectly left-aligned regardless of content.
 *   - The scroll indicator is hidden for a cleaner mobile aesthetic.
 *   - Footer uses `pb-10` to account for bottom safe area on modern phones.
 *
 * @example
 * <ActionScreenLayout
 *   header={<Text>My Title</Text>}
 *   footer={<PrimaryButton>Save</PrimaryButton>}
 * >
 *   {items.map(item => <ListItem key={item.id} />)}
 * </ActionScreenLayout>
 */
export function ActionScreenLayout({
  children,
  header,
  footer,
  paddingHorizontal = 16,
  className = "",
  scrollClassName = "",
  footerClassName = "",
}: ActionScreenLayoutProps) {
  return (
    <UView className={`flex-1 bg-black ${className}`}>
      {/* ZONE 0: FIXED HEADER — stays pinned above the scroll area */}
      {header && (
        <UView style={{ paddingHorizontal }}>
          {header}
        </UView>
      )}

      {/* ZONE 1: SCROLLABLE CONTENT — flex-1 fills all remaining vertical space */}
      <UScroll
        showsVerticalScrollIndicator={false}
        className={`flex-1 ${scrollClassName}`}
        contentContainerStyle={{
          paddingHorizontal,
          paddingBottom: 0,
        }}
      >
        {children}
      </UScroll>

      {/* ZONE 2: FIXED FOOTER — stays pinned at the bottom of the screen */}
      {footer && (
        <UView
          className={`pb-10 pt-4 ${footerClassName}`}
          style={{ paddingHorizontal }}
        >
          {footer}
        </UView>
      )}
    </UView>
  );
}
