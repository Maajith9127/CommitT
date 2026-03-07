import React, { useEffect, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { withUniwind } from "uniwind";

const UView = withUniwind(View);

interface CustomSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  activeColor?: string;
  inactiveColor?: string;
  thumbColor?: string;
}

export function CustomSwitch({
  value,
  onValueChange,
  activeColor = "#4FA0FF",
  inactiveColor = "#3E4553",
  thumbColor = "#FFFFFF",
}: CustomSwitchProps) {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false, // backgroundColor and translateX don't support native driver in some versions/props
    }).start();
  }, [value]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22], // adjust depending on width
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor, activeColor],
  });

  return (
    <Pressable onPress={() => onValueChange(!value)}>
      <Animated.View
        style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          backgroundColor,
          justifyContent: "center",
          paddingHorizontal: 2,
        }}
      >
        <Animated.View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: thumbColor,
            transform: [{ translateX }],
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
