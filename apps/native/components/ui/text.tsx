import { Text } from "react-native";
import { withUniwind } from "uniwind";

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
    <UText className={`mb-2 text-center font-light text-base text-gray-300 ${className}`}>
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
    <UText className={`mb-6 text-center font-medium text-3xl text-white ${className}`}>
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
  return <UText className={`mt-1 text-gray-400 text-xs ${className}`} style={style}>{children}</UText>;
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
    <UText className={`font-semibold text-white text-xl ${className}`} style={style}>
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
    <UText className={`text-white text-base ${className}`} style={style} numberOfLines={numberOfLines}>
      {children}
    </UText>
  );
}
