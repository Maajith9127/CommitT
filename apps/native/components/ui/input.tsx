import React, { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { withUniwind } from "uniwind";

const UInput = withUniwind(TextInput);

export const Input = forwardRef<TextInput, TextInputProps & { className?: string }>(
  ({ className = "", ...props }, ref) => {
    return (
      <UInput
        ref={ref}
        placeholderTextColor="#666"
        className={`w-full rounded-4xl bg-[#1A1A1A] p-4 font-semibold text-white text-xl ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
