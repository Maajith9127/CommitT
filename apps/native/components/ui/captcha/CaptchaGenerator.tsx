import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Text as SvgText, Line, Circle, Rect } from "react-native-svg";

type Difficulty = "low" | "medium" | "high";

interface CaptchaGeneratorProps {
  difficulty: string; // 'low' | 'medium' | 'high'
  width?: number;
  height?: number;
}

export function CaptchaGenerator({ difficulty, width = 280, height = 80 }: CaptchaGeneratorProps) {
  // Generate random 6-char text. Regenerate when difficulty changes to show "different" sample.
  const text = useMemo(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }, [difficulty]);

  const config = useMemo(() => {
    switch (difficulty) {
      case "low":
        return { lines: 2, dots: 10, rotationRange: 5, fontSize: 36, color: "#4CD964" }; // Green
      case "medium":
        return { lines: 8, dots: 30, rotationRange: 20, fontSize: 34, color: "#FACC15" }; // Yellow
      case "high":
        return { lines: 25, dots: 80, rotationRange: 45, fontSize: 32, color: "#EF4444" }; // Red
      default:
        return { lines: 2, dots: 10, rotationRange: 5, fontSize: 36, color: "#4CD964" };
    }
  }, [difficulty]);

  const elements = useMemo(() => {
    const lines = [];
    for (let i = 0; i < config.lines; i++) {
      lines.push(
        <Line
          key={`line-${i}`}
          x1={Math.random() * width}
          y1={Math.random() * height}
          x2={Math.random() * width}
          y2={Math.random() * height}
          stroke="gray"
          strokeWidth={Math.random() * 2 + 1}
          opacity={0.5}
        />,
      );
    }
    const dots = [];
    for (let i = 0; i < config.dots; i++) {
      dots.push(
        <Circle
          key={`dot-${i}`}
          cx={Math.random() * width}
          cy={Math.random() * height}
          r={Math.random() * 2}
          fill="gray"
          opacity={0.5}
        />,
      );
    }
    return { lines, dots };
  }, [config, width, height]);

  // Render chars with rotation
  const charElements = text.split("").map((char, index) => {
    // Basic spacing
    const spacing = width / 7;
    const x = spacing * (index + 0.8) + (width - spacing * 6) / 2;
    const y = height / 2 + 10;
    const rotate = (Math.random() - 0.5) * config.rotationRange * 2;
    return (
      <SvgText
        key={index}
        x={x}
        y={y}
        fontSize={config.fontSize}
        fontWeight="bold"
        fill={config.color}
        textAnchor="middle"
        rotation={rotate}
        origin={`${x}, ${y}`}
      >
        {char}
      </SvgText>
    );
  });

  return (
    <View
      style={{
        width,
        height,
        backgroundColor: "#111",
        borderRadius: 12,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#333",
      }}
    >
      <Svg height={height} width={width}>
        {/* Background */}
        <Rect x="0" y="0" width={width} height={height} fill="#18181b" />

        {/* Noise Layers */}
        {elements.lines}
        {elements.dots}

        {/* Text */}
        {charElements}

        {/* Extra interference for high difficulty */}
        {difficulty === "high" && (
          <>
            <Line
              x1="0"
              y1={Math.random() * height}
              x2={width}
              y2={Math.random() * height}
              stroke="white"
              opacity={0.3}
              strokeWidth={2}
            />
            <Line
              x1={Math.random() * width}
              y1="0"
              x2={Math.random() * width}
              y2={height}
              stroke="white"
              opacity={0.3}
              strokeWidth={2}
            />
          </>
        )}
      </Svg>
    </View>
  );
}
