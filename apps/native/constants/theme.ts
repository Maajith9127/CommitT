export const THEME = {
  colors: {
    // Brand Colors
    primary: "#C6613F", // Saffron / Burnt Orange
    primaryDark: "#A84C2E",

    // Backgrounds
    background: "#080808", // Obsidian Black
    surface: "#212120ff", // Warm Charcoal
    surfaceElevated: "#2A2A2A", // Lighter Gray (Inner elements)
    pureBlack: "#000000", // OLED Black for boundaries

    // Text & Icons
    textMain: "#FFFFFF",
    textMuted: "#8A8A8A",
    
    // Status
    danger: "#FF3B30",
    success: "#4CD964",
    border: "rgba(255, 255, 255, 0.3)",
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
