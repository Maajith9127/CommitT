import { Pressable, Text } from "react-native";
import { useRouter } from 'expo-router';

/** 🐜 Floating Chaos button — ONLY in __DEV__ */
export function ChaosFab() {
  const router = useRouter();
  if (!__DEV__) return null;
  
  return (
    <Pressable
      onPress={() => router.push('/(dev)/chaos')}
      style={{
        position: 'absolute',
        bottom: 280,
        right: 16,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FF3B30',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      }}
    >
      <Text style={{ fontSize: 20 }}>🐛</Text>
    </Pressable>
  );
}
