import { ActivityIndicator, Text, View } from "react-native";

interface LoadingStateProps {
  message?: string;
  size?: "small" | "large";
}

export const LoadingState = ({
  message = "Loading...",
  size = "large",
}: LoadingStateProps) => (
  <View className="flex-1 items-center justify-center py-12">
    <ActivityIndicator color="#3b82f6" size={size} />
    <Text className="mt-4 text-center text-muted-foreground">{message}</Text>
  </View>
);
