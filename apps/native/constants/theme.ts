export const THEME = {
  colors: {
    // Brand Colors (Hardened Saffron)
    primary: "#C6613F", 
    primaryLight: "#E27E5A", 
    primaryDark: "#8A3B22", // Deepened Saffron

    // Backgrounds (Obsidian Core)
    background: "#080808",
    surface: "#171717", 
    surfaceElevated: "#222222", 
    surfaceLight: "rgba(255, 255, 255, 0.03)", 
    pureBlack: "#000000", 

    // Text & Icons
    textMain: "#FFFFFF",
    textMuted: "#949494", 
    
    // Status & Utility
    danger: "#FF3B30",
    success: "#34C759", 
    border: "rgba(255, 255, 255, 0.08)", // Premium subtle borders
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  radii: {
    base: 8,
    md: 12, // xl
    lg: 16,
    card: 24, // 3xl
    inner: 32, // 4xl
    full: 9999,
  },
  typography: {
    size: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      xxxl: 30, // 3xl
      display: 48, // 5xl
    },
    weight: {
      light: "300",
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    } as const
  }
};
