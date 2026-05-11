import { Text } from "react-native";
import { withUniwind } from "uniwind";
import { THEME } from "@/constants/theme";

const UText = withUniwind(Text);

// -----------------------------
// 1. Small Title (Welcome to Commit)
// -----------------------------
export function AuthTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <UText 
      className={`mb-2 text-center font-light text-base ${className}`}
      style={{ color: THEME.colors.textMuted }}
    >
      {children}
    </UText>
  );
}

// -----------------------------
// 2. Main Heading (Regain control...)
// -----------------------------
export function AuthHeading({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <UText 
      className={`mb-6 text-center font-medium text-3xl ${className}`}
      style={{ color: THEME.colors.textMain }}
    >
      {children}
    </UText>
  );
}

// -----------------------------
// 3. Footer Text (Bottom Tab Label)
// -----------------------------
export function FooterText({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: any;
}) {
  return <UText className={`mt-1 text-xs ${className}`} style={[{ color: THEME.colors.textMuted }, style]}>{children}</UText>;
}

// -----------------------------
// 4. Header Title (Schedules, Templates, etc.)
// -----------------------------
export function HeaderTitle({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: object;
}) {
  return (
    <UText className={`font-semibold text-xl ${className}`} style={[{ color: THEME.colors.textMain }, style]}>
      {children}
    </UText>
  );
}

// -----------------------------
// 5. Body Text (General Content)
// -----------------------------
export function BodyText({
  children,
  className = "",
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  className?: string;
  style?: any;
  numberOfLines?: number;
}) {
  return (
    <UText 
      className={`text-base ${className}`} 
      style={[{ color: THEME.colors.textMain }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </UText>
  );
}
