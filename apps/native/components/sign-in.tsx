import { Card, useThemeColor } from "heroui-native";
import { useState, useEffect } from "react";
import { ActivityIndicator, Text, TextInput, Pressable, View } from "react-native";
import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
  isErrorWithCode,
} from "@react-native-google-signin/google-signin";
import { authClient } from "@/lib/auth-client";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutedColor = useThemeColor("muted");
  const accentColor = useThemeColor("accent");
  const foregroundColor = useThemeColor("foreground");
  const dangerColor = useThemeColor("danger");

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        onError: (error) => {
          setError(error.error?.message || "Failed to sign in");
          setIsLoading(false);
        },
        onSuccess: () => {
          setEmail("");
          setPassword("");
        },
        onFinished: () => {
          setIsLoading(false);
        },
      },
    );
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const { idToken, accessToken } = await GoogleSignin.getTokens();
        await authClient.signIn.social({
          provider: "google",
          idToken: {
            token: idToken,
            accessToken: accessToken,
          },
        });
        setIsLoading(false);
      } else {
        setError("Sign-in cancelled");
        setIsLoading(false);
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            setError("Sign-in already in progress");
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setError("Google Play Services unavailable");
            break;
          default:
            setError("Google sign-in error");
        }
      } else {
        setError("An error occurred");
      }
      setIsLoading(false);
    }
  };

  return (
    <Card variant="secondary" className="mt-6 p-4">
      <Card.Title className="mb-4">Sign In</Card.Title>

      {error && (
        <View className="mb-4 p-3 bg-danger/10 rounded-lg">
          <Text className="text-danger text-sm">{error}</Text>
        </View>
      )}

      <TextInput
        className="mb-3 py-3 px-4 rounded-lg bg-surface text-foreground border border-divider"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor={mutedColor}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        className="mb-4 py-3 px-4 rounded-lg bg-surface text-foreground border border-divider"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        placeholderTextColor={mutedColor}
        secureTextEntry
      />

      <Pressable
        onPress={handleLogin}
        disabled={isLoading}
        className="bg-accent p-4 rounded-lg flex-row justify-center items-center active:opacity-70"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={foregroundColor} />
        ) : (
          <Text className="text-foreground font-medium">Sign In</Text>
        )}
      </Pressable>

      <View className="my-4 flex-row items-center">
        <View className="flex-1 h-px bg-divider" />
        <Text className="mx-4 text-muted text-sm">or</Text>
        <View className="flex-1 h-px bg-divider" />
      </View>

      <Pressable
        onPress={handleGoogleLogin}
        disabled={isLoading}
        className="bg-accent p-4 rounded-lg flex-row justify-center items-center active:opacity-70"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={foregroundColor} />
        ) : (
          <Text className="text-foreground font-medium">Sign In with Google</Text>
        )}
      </Pressable>
    </Card>
  );
}
