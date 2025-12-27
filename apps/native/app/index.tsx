import { useRouter } from 'expo-router';
import { Image, ImageBackground, View } from 'react-native';
import {
  AuthHeading,
  AuthTitle,
  PrimaryButton,
  ScreenContainer,
} from '@/components/ui';

export default function Index() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require('../assets/images/onboarding.png')}
      resizeMode="cover"
      style={{ flex: 1 }}
    >
      <ScreenContainer className="">
        <View className="mt-9 items-center px-3">
          <AuthTitle>Welcome to CommitT</AuthTitle>
          <AuthHeading>Regain control over your habit loops</AuthHeading>
        </View>

        <View className="mb-1 items-center">
          <Image
            source={require('../assets/images/logo.png')}
            style={{
              width: 370,
              height: 370,
              marginVertical: 10,
            }}
            resizeMode="contain"
          />
        </View>

        <View className="flex-1" />

        <View className="mb-6">
          <PrimaryButton onPress={() => router.push('/(auth)/signin')}>
            Let's Go!!
          </PrimaryButton>
        </View>
      </ScreenContainer>
    </ImageBackground>
  );
}
