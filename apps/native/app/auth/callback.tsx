import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { authClient } from '@/lib/auth-client';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      console.log('OAuth callback loaded');

      const session = await authClient.getSession();
      console.log('Session result:', session);

      if (session?.data) {
        console.log('Login success → redirect to welcome');
        router.replace('/(auth)/welcome');
      } else {
        console.log('No session → back to signin');
        router.replace('/(auth)/signin');
      }
    };

    checkSession();
  }, []);

  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#4FA0FF" />
    </View>
  );
}
