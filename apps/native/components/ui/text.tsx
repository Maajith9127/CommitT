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
      className={`mb-2 text-center ${className}`}
      style={{ color: THEME.colors.textMuted, fontSize: THEME.typography.size.base, fontWeight: THEME.typography.weight.light }}
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
      className={`mb-6 text-center ${className}`}
      style={{ color: THEME.colors.textMain, fontSize: THEME.typography.size.xxxl, fontWeight: THEME.typography.weight.medium }}
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
  return <UText className={`mt-1 ${className}`} style={[{ color: THEME.colors.textMuted, fontSize: THEME.typography.size.xs }, style]}>{children}</UText>;
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
    <UText className={`${className}`} style={[{ color: THEME.colors.textMain, fontSize: THEME.typography.size.xl, fontWeight: THEME.typography.weight.semibold }, style]}>
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
      className={`${className}`} 
      style={[{ color: THEME.colors.textMain, fontSize: THEME.typography.size.base }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </UText>
  );
}
