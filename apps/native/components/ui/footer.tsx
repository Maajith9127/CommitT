import { Text, TouchableOpacity, View } from "react-native";
import { withUniwind } from "uniwind";
import { THEME } from "@/constants/theme";

const UText = withUniwind(Text);
const UView = withUniwind(View);
const UButton = withUniwind(TouchableOpacity);

// -----------------------------
// 1. AuthMemberPrompt
// -----------------------------
export function AuthMemberPrompt({
  text = "Already a member?",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  return <UText className={`mb-4 text-center text-base ${className}`} style={{ color: THEME.colors.textMuted }}>{text}</UText>;
}

// -----------------------------
// 2. FooterLink (inline small clickable link)
// -----------------------------
export function FooterLink({
  children,
  onPress,
  className = "",
}: {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
}) {
  return (
    <UButton onPress={onPress}>
      <UText className={`text-base underline ${className}`} style={{ color: THEME.colors.primary }}>{children}</UText>
    </UButton>
  );
}

// -----------------------------
// 3. AuthFooterLegal (dynamic)
// -----------------------------
export function AuthFooterLegal({
  prefixText = "By proceeding, you agree to our",
  privacyText = "Privacy Policy",
  termsText = "Conditions of Use",
  onPressPrivacy,
  onPressTerms,
  className = "",
}: {
  prefixText?: string;
  privacyText?: string;
  termsText?: string;
  onPressPrivacy?: () => void;
  onPressTerms?: () => void;
  className?: string;
}) {
  return (
    <UView className={`items-center ${className}`}>
      <UText className="mb-1 text-center text-sm" style={{ color: THEME.colors.textMuted }}>{prefixText}</UText>

      <UView className="flex-row space-x-2">
        <FooterLink onPress={onPressPrivacy}>{privacyText}</FooterLink>
        <UText style={{ color: THEME.colors.textMuted }}>and</UText>
        <FooterLink onPress={onPressTerms}>{termsText}</FooterLink>
      </UView>
    </UView>
  );
}
