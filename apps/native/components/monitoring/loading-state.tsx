import { ActivityIndicator, Text, View } from 'react-native';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
}

export const LoadingState = ({ 
  message = 'Loading...', 
  size = 'large' 
}: LoadingStateProps) => {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <ActivityIndicator size={size} color="#3b82f6" />
      <Text className="mt-4 text-muted-foreground text-center">
        {message}
      </Text>
    </View>
  );
};
