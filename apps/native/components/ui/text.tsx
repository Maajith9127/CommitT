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
    <UText className={`text-gray-300 font-light text-base text-center mb-2 ${className}`}>
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
      className={`text-white text-3xl font-medium  text-center mb-6 ${className}`}
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
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <UText
      className={`text-xs  text-gray-400 mt-1 ${className}`}
    >
      {children}
    </UText>
  );
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
    <UText
      className={`text-white text-xl font-semibold ${className}`}
      style={style}
    >
      {children}
    </UText>
  );
}

