import { Text, TouchableOpacity, View } from "react-native";
import { withUniwind } from "uniwind";

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
  return (
    <UText className={`text-gray-300 text-base text-center mb-4 ${className}`}>
      {text}
    </UText>
  );
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
      <UText className={`text-blue-400 underline text-base ${className}`}>
        {children}
      </UText>
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
      <UText className="text-gray-400 text-sm text-center mb-1">
        {prefixText}
      </UText>

      <UView className="flex-row space-x-2">
        <FooterLink onPress={onPressPrivacy}>{privacyText}</FooterLink>
        <UText className="text-gray-400">and</UText>
        <FooterLink onPress={onPressTerms}>{termsText}</FooterLink>
      </UView>
    </UView>
  );
}
