import React from "react";
import { View, ScrollView } from "react-native";
import { withUniwind } from "uniwind";

const UView = withUniwind(View);
const UScroll = withUniwind(ScrollView);

type ActionScreenLayoutProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  paddingHorizontal?: number;
  className?: string;
  scrollClassName?: string;
  footerClassName?: string;
};

/**
 * A production-level layout component that ensures the scrollable content
 * and the fixed bottom action button always have perfectly aligned widths.
 */
export function ActionScreenLayout({
  children,
  footer,
  paddingHorizontal = 16,
  className = "",
  scrollClassName = "",
  footerClassName = "",
}: ActionScreenLayoutProps) {
  return (
    <UView className={`flex-1 bg-black ${className}`}>
      {/* 1. SCROLLABLE CONTENT */}
      <UScroll
        showsVerticalScrollIndicator={false}
        className={`flex-1 ${scrollClassName}`}
        contentContainerStyle={{ 
          paddingHorizontal,
          paddingBottom: 0, // extra space before footer
        }}
      >
        {children}
      </UScroll>

      {/* 2. FIXED FOOTER (ACTION BUTTON) */}
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
