import React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { withUniwind } from "uniwind";
import { THEME } from "@/constants/theme";

const UInput = withUniwind(TextInput);

export function Input({ className = "", innerRef, ...props }: TextInputProps & { className?: string, innerRef?: React.Ref<TextInput> }) {
  return (
    <UInput
      ref={innerRef}
      placeholderTextColor={THEME.colors.textMuted}
      className={`w-full rounded-4xl p-4 font-semibold text-xl ${className}`}
      {...props}
      style={[{ backgroundColor: THEME.colors.surfaceElevated, color: THEME.colors.textMain }, props.style]}
    />
  );
}
